# frozen_string_literal: true

require 'email/sender'
require 'nokogiri'

class ::Assigner
  ASSIGNMENTS_PER_TOPIC_LIMIT = 5

  def self.backfill_auto_assign
    staff_mention = User
      .assign_allowed
      .pluck('username')
      .map { |name| "p.cooked ILIKE '%mention%@#{name}%'" }
      .join(' OR ')

    sql = <<~SQL
      SELECT p.topic_id, MAX(post_number) post_number
        FROM posts p
        JOIN topics t ON t.id = p.topic_id
        LEFT JOIN assignments a ON a.target_id = p.topic_id AND a.target_type = 'Topic'
       WHERE p.user_id IN (SELECT id FROM users WHERE moderator OR admin)
         AND (#{staff_mention})
         AND a.assigned_to_id IS NULL
         AND NOT t.closed
         AND t.deleted_at IS NULL
       GROUP BY p.topic_id
    SQL

    puts
    assigned = 0

    ActiveRecord::Base.connection.raw_connection.exec(sql).to_a.each do |row|
      post = Post.find_by(post_number: row["post_number"].to_i, topic_id: row["topic_id"].to_i)
      assigned += 1 if post && auto_assign(post)
      putc "."
    end

    puts
    puts "#{assigned} topics where automatically assigned to staff members"
  end

  def self.assigned_self?(text)
    return false if text.blank? || SiteSetting.assign_self_regex.blank?
    regex = Regexp.new(SiteSetting.assign_self_regex) rescue nil
    !!(regex && text[regex])
  end

  def self.assigned_other?(text)
    return false if text.blank? || SiteSetting.assign_other_regex.blank?
    regex = Regexp.new(SiteSetting.assign_other_regex) rescue nil
    !!(regex && text[regex])
  end

  def self.auto_assign(post, force: false)
    return unless SiteSetting.assigns_by_staff_mention

    if post.user && post.topic && post.user.can_assign?
      return if post.topic.assignment.present? && !force

      # remove quotes, oneboxes and code blocks
      doc = Nokogiri::HTML5.fragment(post.cooked)
      doc.css(".quote, .onebox, pre, code").remove
      text = doc.text.strip

      assign_other = assigned_other?(text) && mentioned_staff(post)
      assign_self = assigned_self?(text) && post.user
      return unless assign_other || assign_self

      if is_last_staff_post?(post)
        assigner = new(post.topic, post.user)
        if assign_other
          assigner.assign(assign_other, silent: true)
        elsif assign_self
          assigner.assign(assign_self, silent: true)
        end
      end
    end
  end

  def self.is_last_staff_post?(post)
    allowed_user_ids = User.assign_allowed.pluck(:id).join(',')

    sql = <<~SQL
      SELECT 1
        FROM posts p
        JOIN users u ON u.id = p.user_id
       WHERE p.deleted_at IS NULL
         AND p.topic_id = :topic_id
         AND u.id IN (#{allowed_user_ids})
      HAVING MAX(post_number) = :post_number
    SQL

    args = {
      topic_id: post.topic_id,
      post_number: post.post_number
    }

    DB.exec(sql, args) == 1
  end

  def self.mentioned_staff(post)
    mentions = post.raw_mentions
    if mentions.present?
      User.human_users
        .assign_allowed
        .where('username_lower IN (?)', mentions.map(&:downcase))
        .first
    end
  end

  def self.publish_topic_tracking_state(topic, user_id)
    if topic.private_message?
      MessageBus.publish(
        "/private-messages/assigned",
        { topic_id: topic.id },
        user_ids: [user_id]
      )
    end
  end

  def initialize(target, user)
    @assigned_by = user
    @target = target
  end

  def allowed_user_ids
    @allowed_user_ids ||= User.assign_allowed.pluck(:id)
  end

  def allowed_group_ids
    @allowed_group_ids ||= Group.assignable(@assigned_by).pluck(:id)
  end

  def can_assign_to?(assign_to)
    return true if assign_to.is_a?(Group)
    return true if @assigned_by.id == assign_to.id

    assigned_total = Assignment
      .joins_with_topics
      .where(topics: { deleted_at: nil })
      .where(assigned_to_id: assign_to.id, active: true)
      .count

    assigned_total < SiteSetting.max_assigned_topics
  end

  def can_be_assigned?(assign_to)
    if assign_to.is_a?(User)
      allowed_user_ids.include?(assign_to.id)
    else
      allowed_group_ids.include?(assign_to.id)
    end
  end

  def topic_target?
    @topic_target ||= @target.is_a?(Topic)
  end

  def post_target?
    @post_target ||= @target.is_a?(Post)
  end

  def can_assignee_see_target?(assignee)
    return Guardian.new(assignee).can_see_topic?(@target) if topic_target?
    return Guardian.new(assignee).can_see_post?(@target) if post_target?

    raise Discourse::InvalidAccess
  end

  def topic
    return @topic if @topic
    @topic = @target if topic_target?
    @topic = @target.topic if post_target?

    raise Discourse::InvalidParameters if !@topic
    @topic
  end

  def first_post
    topic.posts.where(post_number: 1).first
  end

  def forbidden_reasons(assign_to:, type:)
    case
    when assign_to.is_a?(User) && !can_assignee_see_target?(assign_to)
      topic.private_message? ? :forbidden_assignee_not_pm_participant : :forbidden_assignee_cant_see_topic
    when assign_to.is_a?(Group) && assign_to.users.any? { |user| !can_assignee_see_target?(user) }
      topic.private_message? ? :forbidden_group_assignee_not_pm_participant : :forbidden_group_assignee_cant_see_topic
    when !can_be_assigned?(assign_to)
      assign_to.is_a?(User) ? :forbidden_assign_to : :forbidden_group_assign_to
    when topic.assignment&.assigned_to_id == assign_to.id && topic.assignment&.assigned_to_type == type && topic.assignment.active == true
      assign_to.is_a?(User) ? :already_assigned : :group_already_assigned
    when @target.is_a?(Topic) && Assignment.where(topic_id: topic.id, target_type: "Post", active: true).any? { |assignment| assignment.assigned_to_id == assign_to.id && assignment.assigned_to_type == type }
      assign_to.is_a?(User) ? :already_assigned : :group_already_assigned
    when Assignment.where(topic: topic).count >= ASSIGNMENTS_PER_TOPIC_LIMIT
      :too_many_assigns_for_topic
    when !can_assign_to?(assign_to)
      :too_many_assigns
    end
  end

  def assign(assign_to, priority: nil, silent: false)
    type = assign_to.is_a?(User) ? "User" : "Group"

    forbidden_reason = forbidden_reasons(assign_to: assign_to, type: type)
    return { success: false, reason: forbidden_reason } if forbidden_reason

    action_code = {}
    action_code[:user] = topic.assignment.present? ? "reassigned" : "assigned"
    action_code[:group] = topic.assignment.present? ? "reassigned_group" : "assigned_group"

    @target.assignment&.destroy!

    assignment = @target.create_assignment!(assigned_to_id: assign_to.id, assigned_to_type: type, assigned_by_user_id: @assigned_by.id, topic_id: topic.id, priority: priority)

    first_post.publish_change_to_clients!(:revised, reload_topic: true)

    serializer = assignment.assigned_to_user? ? BasicUserSerializer : BasicGroupSerializer

    Jobs.enqueue(:assign_notification,
                 topic_id: topic.id,
                 post_id: topic_target? ? first_post.id : @target.id,
                 assigned_to_id: assign_to.id,
                 assigned_to_type: type,
                 assigned_by_id: @assigned_by.id,
                 silent: silent)

    MessageBus.publish(
      "/staff/topic-assignment",
      {
        type: "assigned",
        topic_id: topic.id,
        post_id: post_target? && @target.id,
        post_number: post_target? && @target.post_number,
        assigned_type: type,
        assigned_to: serializer.new(assign_to, scope: Guardian.new, root: false).as_json
      },
      user_ids: allowed_user_ids
    )

    if assignment.assigned_to_user?
      if !TopicUser.exists?(
        user_id: assign_to.id,
        topic_id: topic.id,
        notification_level: TopicUser.notification_levels[:watching]
      )
        TopicUser.change(
          assign_to.id,
          topic.id,
          notification_level: TopicUser.notification_levels[:watching],
          notifications_reason_id: TopicUser.notification_reasons[:plugin_changed]
        )
      end

      if SiteSetting.assign_mailer == AssignMailer.levels[:always] || (SiteSetting.assign_mailer == AssignMailer.levels[:different_users] && @assigned_by.id != assign_to.id)
        if !topic.muted?(assign_to)
          message = AssignMailer.send_assignment(assign_to.email, topic, @assigned_by)
          Email::Sender.new(message, :assign_message).send
        end
      end
    end
    if !silent
      custom_fields = { "action_code_who" => assign_to.is_a?(User) ? assign_to.username : assign_to.name }

      if post_target?
        custom_fields.merge!({ "action_code_path" => "/p/#{@target.id}", "action_code_post_id" => @target.id })
      end

      topic.add_moderator_post(
        @assigned_by,
        nil,
        bump: false,
        post_type: SiteSetting.assigns_public ? Post.types[:small_action] : Post.types[:whisper],
        action_code: moderator_post_assign_action_code(assignment, action_code),
        custom_fields: custom_fields
      )
    end

    # Create a webhook event
    if WebHook.active_web_hooks(:assign).exists?
      type = :assigned
      payload = {
        type: type,
        topic_id: topic.id,
        topic_title: topic.title,
        assigned_by_id: @assigned_by.id,
        assigned_by_username: @assigned_by.username
      }
      if assignment.assigned_to_user?
        payload.merge!({
          assigned_to_id: assign_to.id,
          assigned_to_username: assign_to.username,
        })
      else
        payload.merge!({
          assigned_to_group_id: assign_to.id,
          assigned_to_group_name: assign_to.name,
        })
      end
      WebHook.enqueue_assign_hooks(type, payload.to_json)
    end

    { success: true }
  end

  def unassign(silent: false, deactivate: false)
    if assignment = @target.assignment
      deactivate ? assignment.update!(active: false) : assignment.destroy!

      return if first_post.blank?

      first_post.publish_change_to_clients!(:revised, reload_topic: true)

      Jobs.enqueue(:unassign_notification,
                   topic_id: topic.id,
                   assigned_to_id: assignment.assigned_to.id,
                   assigned_to_type: assignment.assigned_to_type)

      if assignment.assigned_to_user?
        if TopicUser.exists?(
          user_id: assignment.assigned_to_id,
          topic: topic,
          notification_level: TopicUser.notification_levels[:watching],
          notifications_reason_id: TopicUser.notification_reasons[:plugin_changed]
        )

          TopicUser.change(
            assignment.assigned_to_id,
            topic.id,
            notification_level: TopicUser.notification_levels[:tracking],
            notifications_reason_id: TopicUser.notification_reasons[:plugin_changed]
          )
        end
      end

      assigned_to = assignment.assigned_to

      if SiteSetting.unassign_creates_tracking_post && !silent
        post_type = SiteSetting.assigns_public ? Post.types[:small_action] : Post.types[:whisper]

        custom_fields = { "action_code_who" => assigned_to.is_a?(User) ? assigned_to.username : assigned_to.name }

        if post_target?
          custom_fields.merge!("action_code_path" => "/p/#{@target.id}")
          custom_fields.merge!("action_code_post_id" => @target.id)
        end

        topic.add_moderator_post(
          @assigned_by, nil,
          bump: false,
          post_type: post_type,
          custom_fields: custom_fields,
          action_code: moderator_post_unassign_action_code(assignment),
        )
      end

      # Create a webhook event
      if WebHook.active_web_hooks(:assign).exists?
        type = :unassigned
        payload = {
          type: type,
          topic_id: topic.id,
          topic_title: topic.title,
          unassigned_by_id: @assigned_by.id,
          unassigned_by_username: @assigned_by.username
        }
        if assignment.assigned_to_user?
          payload.merge!({
            unassigned_to_id: assigned_to.id,
            unassigned_to_username: assigned_to.username,
          })
        else
          payload.merge!({
            unassigned_to_group_id: assigned_to.id,
            unassigned_to_group_name: assigned_to.name,
          })
        end
        WebHook.enqueue_assign_hooks(type, payload.to_json)
      end

      MessageBus.publish(
        "/staff/topic-assignment",
        {
          type: 'unassigned',
          topic_id: topic.id,
          post_id: post_target? && @target.id,
          post_number: post_target? && @target.post_number,
          assigned_type: assignment.assigned_to.is_a?(User) ? "User" : "Group"
        },
        user_ids: allowed_user_ids
      )
    end
  end

  private

  def moderator_post_assign_action_code(assignment, action_code)
    if assignment.target.is_a?(Post)
      # posts do not have to handle conditions of 'assign' or 'reassign'
      assignment.assigned_to_user? ? "assigned_to_post" : "assigned_group_to_post"
    elsif assignment.target.is_a?(Topic)
      assignment.assigned_to_user? ? "#{action_code[:user]}" : "#{action_code[:group]}"
    end
  end

  def moderator_post_unassign_action_code(assignment)
    suffix =
      if assignment.target.is_a?(Post)
        "_from_post"
      elsif assignment.target.is_a?(Topic)
        ""
      end
    return "unassigned#{suffix}" if assignment.assigned_to_user?
    return "unassigned_group#{suffix}" if assignment.assigned_to_group?
  end
end
