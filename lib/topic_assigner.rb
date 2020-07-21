# frozen_string_literal: true

require 'email/sender'
require 'nokogiri'

class ::TopicAssigner

  ASSIGNED_TO_ID ||= 'assigned_to_id'
  ASSIGNED_BY_ID ||= 'assigned_by_id'

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
        LEFT JOIN topic_custom_fields tc ON tc.name = '#{ASSIGNED_TO_ID}' AND tc.topic_id = p.topic_id
       WHERE p.user_id IN (SELECT id FROM users WHERE moderator OR admin)
         AND (#{staff_mention})
         AND tc.value IS NULL
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
      return unless force || post.topic.custom_fields[ASSIGNED_TO_ID].nil?

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
      allowed_groups = SiteSetting.assign_allowed_on_groups.split('|')

      User.human_users
        .assign_allowed
        .where('username_lower IN (?)', mentions.map(&:downcase))
        .first
    end
  end

  def initialize(topic, user)
    @assigned_by = user
    @topic = topic
  end

  def allowed_user_ids
    @allowed_user_ids ||= User.assign_allowed.pluck(:id)
  end

  def can_assign_to?(user)
    return true if @assigned_by.id == user.id

    assigned_total = TopicCustomField
      .joins(:topic)
      .where(topics: { deleted_at: nil })
      .where(name: ASSIGNED_TO_ID)
      .where(value: user.id)
      .count

    assigned_total < SiteSetting.max_assigned_topics
  end

  def can_be_assigned?(assign_to)
    return false unless allowed_user_ids.include?(assign_to.id)
    Guardian.new(assign_to).can_see_topic?(@topic)
  end

  def assign(assign_to, silent: false)
    return { success: false, reason: :forbidden_assign_to } unless can_be_assigned?(assign_to)
    return { success: false, reason: :already_assigned } if @topic.custom_fields && @topic.custom_fields[ASSIGNED_TO_ID] == assign_to.id.to_s
    return { success: false, reason: :too_many_assigns } unless can_assign_to?(assign_to)

    @topic.custom_fields[ASSIGNED_TO_ID] = assign_to.id
    @topic.custom_fields[ASSIGNED_BY_ID] = @assigned_by.id
    @topic.save_custom_fields

    first_post = @topic.posts.find_by(post_number: 1)
    first_post.publish_change_to_clients!(:revised, reload_topic: true)

    MessageBus.publish(
      "/staff/topic-assignment",
      {
        type: 'assigned',
        topic_id: @topic.id,
        assigned_to: BasicUserSerializer.new(assign_to, root: false).as_json
      },
      user_ids: allowed_user_ids
    )

    publish_topic_tracking_state(@topic, assign_to.id)

    if !TopicUser.exists?(
      user_id: assign_to.id,
      topic_id: @topic.id,
      notification_level: TopicUser.notification_levels[:watching]
    )

      TopicUser.change(
        assign_to.id,
        @topic.id,
        notification_level: TopicUser.notification_levels[:watching],
        notifications_reason_id: TopicUser.notification_reasons[:plugin_changed]
      )
    end

    if SiteSetting.assign_mailer == AssignMailer.levels[:always] || (SiteSetting.assign_mailer == AssignMailer.levels[:different_users] && @assigned_by.id != assign_to.id)
      if !@topic.muted?(assign_to)
        message = AssignMailer.send_assignment(assign_to.email, @topic, @assigned_by)
        Email::Sender.new(message, :assign_message).send
      end
    end

    UserAction.log_action!(
      action_type: UserAction::ASSIGNED,
      user_id: assign_to.id,
      acting_user_id: @assigned_by.id,
      target_post_id: first_post.id,
      target_topic_id: @topic.id
    )

    post_type = SiteSetting.assigns_public ? Post.types[:small_action] : Post.types[:whisper]

    if !silent
      @topic.add_moderator_post(
        @assigned_by,
        nil,
        bump: false,
        post_type: post_type,
        action_code: "assigned",
        custom_fields: { "action_code_who" => assign_to.username }
      )

      if @assigned_by.id != assign_to.id

        Notification.create!(
          notification_type: Notification.types[:custom],
          user_id: assign_to.id,
          topic_id: @topic.id,
          post_number: 1,
          high_priority: true,
          data: {
            message: 'discourse_assign.assign_notification',
            display_username: @assigned_by.username,
            topic_title: @topic.title
          }.to_json
        )
      end
    end

    # we got to send a push notification as well
    # what we created here is a whisper and notification will not raise a push
    if @assigned_by.id != assign_to.id
      PostAlerter.new(first_post).create_notification_alert(
        user: assign_to,
        post: first_post,
        username: @assigned_by.username,
        notification_type: Notification.types[:custom],
        excerpt: I18n.t(
          "discourse_assign.topic_assigned_excerpt",
          title: @topic.title,
          locale: assign_to.effective_locale
        )
      )
    end

    # Create a webhook event
    if WebHook.active_web_hooks(:assign).exists?
      type = :assigned
      payload = {
        type: type,
        topic_id: @topic.id,
        topic_title: @topic.title,
        assigned_to_id: assign_to.id,
        assigned_to_username: assign_to.username,
        assigned_by_id: @assigned_by.id,
        assigned_by_username: @assigned_by.username
      }.to_json
      WebHook.enqueue_assign_hooks(type, payload)
    end

    { success: true }

  end

  def unassign(silent: false)
    if assigned_to_id = @topic.custom_fields[ASSIGNED_TO_ID]

      # TODO core needs an API for this stuff badly
      # currently there is no 100% surefire way of deleting a custom field
      TopicCustomField
        .where(topic_id: @topic.id)
        .where('name in (?)', [ASSIGNED_BY_ID, ASSIGNED_TO_ID])
        .destroy_all

      if Array === assigned_to_id
        # more custom field mess, try to recover
        assigned_to_id = assigned_to_id.first
      end

      # clean up in memory object
      @topic.custom_fields[ASSIGNED_TO_ID] = nil
      @topic.custom_fields[ASSIGNED_BY_ID] = nil

      # nothing to do here
      return if !assigned_to_id

      post = @topic.posts.where(post_number: 1).first
      return unless post.present?

      post.publish_change_to_clients!(:revised, reload_topic: true)

      if TopicUser.exists?(
        user_id: assigned_to_id,
        topic: @topic,
        notification_level: TopicUser.notification_levels[:watching],
        notifications_reason_id: TopicUser.notification_reasons[:plugin_changed]
      )

        TopicUser.change(
          assigned_to_id,
          @topic.id,
          notification_level: TopicUser.notification_levels[:tracking],
          notifications_reason_id: TopicUser.notification_reasons[:plugin_changed]
        )
      end

      MessageBus.publish(
        "/staff/topic-assignment",
        {
          type: 'unassigned',
          topic_id: @topic.id,
        },
        user_ids: allowed_user_ids
      )

      assigned_user = User.find_by(id: assigned_to_id)
      publish_topic_tracking_state(@topic, assigned_user.id)

      UserAction.where(
        action_type: UserAction::ASSIGNED,
        target_post_id: post.id
      ).destroy_all

      # yank notification
      Notification.where(
         notification_type: Notification.types[:custom],
         user_id: assigned_user.id,
         topic_id: @topic.id,
         post_number: 1
      ).where("data like '%discourse_assign.assign_notification%'").destroy_all

      if SiteSetting.unassign_creates_tracking_post && !silent
        post_type = SiteSetting.assigns_public ? Post.types[:small_action] : Post.types[:whisper]
        @topic.add_moderator_post(
          @assigned_by, nil,
          bump: false,
          post_type: post_type,
          custom_fields: { "action_code_who" => assigned_user.username },
          action_code: "unassigned"
        )
      end

      # Create a webhook event
      if WebHook.active_web_hooks(:assign).exists?
        type = :unassigned
        payload = {
          type: type,
          topic_id: @topic.id,
          topic_title: @topic.title,
          unassigned_to_id: assigned_user.id,
          unassigned_to_username: assigned_user.username,
          unassigned_by_id: @assigned_by.id,
          unassigned_by_username: @assigned_by.username
        }.to_json
        WebHook.enqueue_assign_hooks(type, payload)
      end
    end
  end

  private

  def publish_topic_tracking_state(topic, user_id)
    if topic.private_message?
      MessageBus.publish(
        "/private-messages/assigned",
        { topic_id: topic.id },
        user_ids: [user_id]
      )
    end
  end
end
