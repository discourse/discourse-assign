require_dependency 'email/sender'

class ::TopicAssigner

  def self.unassign_all(user, assigned_by)
    topic_ids = TopicCustomField.where(name: 'assigned_to_id', value: user.id).pluck(:topic_id)

    # Fast path: by doing this we can instantly refresh for the user showing no assigned topics
    # while doing the "full" removal asynchronously.
    TopicCustomField.where(
      name: ['assigned_to_id', 'assigned_by_id'],
      topic_id: topic_ids
    ).delete_all

    Jobs.enqueue(
      :unassign_bulk,
      user_id: user.id,
      assigned_by_id: assigned_by.id,
      topic_ids: topic_ids
    )
  end

  def self.backfill_auto_assign
    staff_mention = User.where('moderator OR admin')
      .pluck('username')
      .map { |name| "p.cooked ILIKE '%mention%@#{name}%'" }
      .join(' OR ')

    sql = <<SQL
    SELECT p.topic_id, MAX(post_number) post_number
    FROM posts p
    JOIN topics t ON t.id = p.topic_id
    LEFT JOIN topic_custom_fields tc ON tc.name = 'assigned_to_id' AND tc.topic_id = p.topic_id
    WHERE p.user_id IN (SELECT id FROM users WHERE moderator OR admin) AND
      ( #{staff_mention} ) AND tc.value IS NULL AND NOT t.closed AND t.deleted_at IS NULL
    GROUP BY p.topic_id
SQL

    assigned = 0
    puts

    ActiveRecord::Base.connection.raw_connection.exec(sql).to_a.each do |row|
      post = Post.find_by(post_number: row["post_number"].to_i,
                          topic_id: row["topic_id"].to_i)
      assigned += 1 if post && auto_assign(post)
      putc "."
    end

    puts
    puts "#{assigned} topics where automatically assigned to staff members"
  end

  def self.assign_self_passes?(post)
    return false unless SiteSetting.assign_self_regex.present?
    regex = Regexp.new(SiteSetting.assign_self_regex) rescue nil

    !!(regex && regex.match(post.raw))
  end

  def self.assign_other_passes?(post)
    return true unless SiteSetting.assign_other_regex.present?
    regex = Regexp.new(SiteSetting.assign_other_regex) rescue nil

    !!(regex && regex.match(post.raw))
  end

  def self.auto_assign(post, force: false)
    return unless SiteSetting.assigns_by_staff_mention

    if post.user && post.topic && post.user.staff?
      can_assign = force || post.topic.custom_fields["assigned_to_id"].nil?

      assign_other = assign_other_passes?(post) && mentioned_staff(post)
      assign_self = assign_self_passes?(post) && post.user

      if can_assign && is_last_staff_post?(post)
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
    sql = <<~SQL
      SELECT 1 FROM posts p
       JOIN users u ON u.id = p.user_id AND (moderator OR admin)
       WHERE p.deleted_at IS NULL AND p.topic_id = :topic_id
       having max(post_number) = :post_number

    SQL

    args = {
      topic_id: post.topic_id,
      post_number: post.post_number
    }

    # TODO post 2.1 release remove
    if defined?(DB)
      DB.exec(sql, args) == 1
    else
      Post.exec_sql(sql, args).to_a.length == 1
    end
  end

  def self.mentioned_staff(post)
    mentions = post.raw_mentions
    if mentions.present?
      User.where('moderator OR admin')
        .where('username_lower IN (?)', mentions.map(&:downcase))
        .first
    end
  end

  def initialize(topic, user)
    @assigned_by = user
    @topic = topic
  end

  def staff_ids
    User.real.staff.pluck(:id)
  end

  def assign(assign_to, silent: false)
    @topic.custom_fields["assigned_to_id"] = assign_to.id
    @topic.custom_fields["assigned_by_id"] = @assigned_by.id
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
      user_ids: staff_ids
    )

    publish_topic_tracking_state(@topic, assign_to.id)

    if SiteSetting.assign_mailer_enabled
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

    unless silent
      @topic.add_moderator_post(
        @assigned_by,
        nil,
        bump: false,
        post_type: post_type,
        action_code: "assigned",
        custom_fields: { "action_code_who" => assign_to.username }
      )

      unless @assigned_by.id == assign_to.id

        Notification.create!(
          notification_type: Notification.types[:custom],
          user_id: assign_to.id,
          topic_id: @topic.id,
          post_number: 1,
          data: {
            message: 'discourse_assign.assign_notification',
            display_username: @assigned_by.username,
            topic_title: @topic.title
          }.to_json
        )
      end
    end

    true
  end

  def unassign(silent: false)
    if assigned_to_id = @topic.custom_fields["assigned_to_id"]
      @topic.custom_fields["assigned_to_id"] = nil
      @topic.custom_fields["assigned_by_id"] = nil
      @topic.save_custom_fields

      post = @topic.posts.where(post_number: 1).first
      return unless post.present?

      post.publish_change_to_clients!(:revised, reload_topic: true)

      assigned_user = User.find_by(id: assigned_to_id)
      MessageBus.publish(
        "/staff/topic-assignment",
        {
          type: 'unassigned',
          topic_id: @topic.id,
        },
        user_ids: staff_ids
      )

      publish_topic_tracking_state(@topic, assigned_user.id)

      UserAction.where(
        action_type: UserAction::ASSIGNED,
        target_post_id: post.id
      ).destroy_all

      # yank notification
      Notification.where(
         notification_type: Notification.types[:custom],
         user_id: assigned_user.try(:id),
         topic_id: @topic.id,
         post_number: 1
      ).where("data like '%discourse_assign.assign_notification%'").destroy_all

      if SiteSetting.unassign_creates_tracking_post && !silent
        post_type = SiteSetting.assigns_public ? Post.types[:small_action] : Post.types[:whisper]
        @topic.add_moderator_post(
          @assigned_by, nil,
          bump: false,
          post_type: post_type,
          custom_fields: { "action_code_who" => assigned_user&.username },
          action_code: "unassigned"
        )
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
