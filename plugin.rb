# name: discourse-assign
# about: Assign users to topics
# version: 0.1
# authors: Sam Saffron

enabled_site_setting :assign_enabled

register_asset 'stylesheets/assigns.scss'
load File.expand_path('../lib/discourse_assign/engine.rb', __FILE__)
load File.expand_path('../lib/discourse_assign/helpers.rb', __FILE__)

Discourse::Application.routes.append do
  mount ::DiscourseAssign::Engine, at: "/assign"
  get "topics/private-messages-assigned/:username" => "list#private_messages_assigned", as: "topics_private_messages_assigned", constraints: { username: /[\w.\-]+?/ }
end

after_initialize do
  require 'topic_assigner'

  # Assign the first staff member who replies to the topic as the owner.
  DiscourseEvent.on(:post_created) do |post|
    topic = post.topic
    poster = post.user
    if SiteSetting.assign_first_staff? && topic.custom_fields['assigned_to_id'].nil? && post.post_type != 4 && poster.staff?
      assigner = TopicAssigner.new(topic, poster).assign(poster)
    end
  end

  # Raise an invalid access error if a user tries to act on something
  # not assigned to them
  DiscourseEvent.on(:before_staff_flag_action) do |args|
    if SiteSetting.assign_locks_flags?

      if custom_fields = args[:post].topic.custom_fields
        if assigned_to_id = custom_fields['assigned_to_id']
          unless assigned_to_id.to_i == args[:user].id
            raise Discourse::InvalidAccess.new(
              "That flag has been assigned to another user",
              nil,
              custom_message: 'discourse_assign.flag_assigned'
            )
          end
        elsif SiteSetting.flags_require_assign?
          raise Discourse::InvalidAccess.new(
            "Flags must be assigned before they can be acted on",
            nil,
            custom_message: 'discourse_assign.flag_unclaimed'
          )
        end
      end

    end
  end

  TopicList.preloaded_custom_fields << "assigned_to_id"

  TopicList.on_preload do |topics, topic_list|
    if SiteSetting.assign_enabled?
      is_staff = topic_list.current_user && topic_list.current_user.staff?
      allowed_access = SiteSetting.assigns_public || is_staff

      if allowed_access && topics.length > 0
        users = User.where("users.id in (
              SELECT value::int
              FROM topic_custom_fields
              WHERE name = 'assigned_to_id' AND topic_id IN (?)
        )", topics.map(&:id))
          .joins('join user_emails on user_emails.user_id = users.id AND user_emails.primary')
          .select(AvatarLookup.lookup_columns)

        map = {}
        users.each { |u| map[u.id] = u }

        topics.each do |t|
          if id = t.custom_fields['assigned_to_id']
            t.preload_assigned_to_user(map[id.to_i])
          end
        end
      end
    end
  end

  require_dependency 'topic_query'
  TopicQuery.add_custom_filter(:assigned) do |results, topic_query|
    if topic_query.guardian.is_staff? || SiteSetting.assigns_public
      username = topic_query.options[:assigned]

      user_id = topic_query.guardian.user.id if username == "me"

      special = ["*", "nobody"].include?(username)

      if username.present? && !special
        user_id ||= User.where(username_lower: username.downcase).pluck(:id).first
      end

      if user_id || special

        if username == "nobody"
          results = results.joins("LEFT JOIN topic_custom_fields tc_assign ON
                                    topics.id = tc_assign.topic_id AND
                                    tc_assign.name = 'assigned_to_id'")
            .where("tc_assign.name IS NULL")
        else

          if username == "*"
            filter = "AND tc_assign.value IS NOT NULL"
          else
            filter = "AND tc_assign.value = '#{user_id.to_i.to_s}'"
          end

          results = results.joins("JOIN topic_custom_fields tc_assign ON
                                    topics.id = tc_assign.topic_id AND
                                    tc_assign.name = 'assigned_to_id'
                                    #{filter}
                                  ")
        end
      end
    end

    results
  end

  require_dependency 'topic_list_item_serializer'
  class ::TopicListItemSerializer
    has_one :assigned_to_user, serializer: BasicUserSerializer, embed: :objects
  end

  require_dependency 'list_controller'
  class ::ListController
    generate_message_route(:private_messages_assigned)
  end

  add_to_class(:topic_query, :list_private_messages_assigned) do |user|
    list = private_messages_for(user, :all)
    list = list.where("topics.id IN (
        SELECT topic_id FROM topic_custom_fields WHERE name = 'assigned_to_id' AND value = ?
    )", user.id.to_s)
    create_list(:private_messages, {}, list)
  end

  add_to_class(:topic, :assigned_to_user) do
    @assigned_to_user ||
      if user_id = custom_fields["assigned_to_id"]
        @assigned_to_user = User.find_by(id: user_id)
      end
  end

  add_to_class(:topic, :preload_assigned_to_user) do |assigned_to_user|
    @assigned_to_user = assigned_to_user
  end

  add_to_serializer(:topic_list_item, 'include_assigned_to_user?') do
    (SiteSetting.assigns_public || scope.is_staff?) && object.assigned_to_user
  end

  add_to_serializer(:topic_view, :assigned_to_user, false) do
    DiscourseAssign::Helpers.build_assigned_to_user(assigned_to_user_id, object.topic)
  end

  add_to_class(:topic_view_serializer, :assigned_to_user_id) do
    id = object.topic.custom_fields["assigned_to_id"]
    # a bit messy but race conditions can give us an array here, avoid
    id && id.to_i rescue nil
  end

  add_to_serializer(:topic_view, 'include_assigned_to_user?') do
    if SiteSetting.assigns_public || scope.is_staff?
      # subtle but need to catch cases where stuff is not assigned
      object.topic.custom_fields.keys.include?("assigned_to_id")
    end
  end

  add_to_serializer(:flagged_topic, :assigned_to_user) do
    DiscourseAssign::Helpers.build_assigned_to_user(assigned_to_user_id, object)
  end

  add_to_serializer(:flagged_topic, :assigned_to_user_id) do
    id = object.custom_fields["assigned_to_id"]
    # a bit messy but race conditions can give us an array here, avoid
    id && id.to_i rescue nil
  end

  on(:post_created) do |post|
    ::TopicAssigner.auto_assign(post, force: true)
  end

  on(:post_edited) do |post, topic_changed|
    ::TopicAssigner.auto_assign(post, force: true)
  end

  on(:topic_closed) do |topic|
    if SiteSetting.unassign_on_close
      assigner = ::TopicAssigner.new(topic, Discourse.system_user)
      assigner.unassign(silent: true)
    end
  end

  # Unassign if there are no more flags in the topic
  on(:flag_reviewed) do |post|
    if SiteSetting.assign_locks_flags? &&
      FlagQuery.flagged_post_actions(topic_id: post.topic_id).count == 0

      assigner = ::TopicAssigner.new(post.topic, Discourse.system_user)
      assigner.unassign
    end
  end

  add_class_method(:topic_tracking_state, :publish_assigned_private_message) do |topic, user_id|
    return unless topic.private_message?

    MessageBus.publish(
      "/private-messages/assigned",
      { topic_id: topic.id },
      user_ids: [user_id]
    )
  end

  on(:move_to_inbox) do |info|
    topic = info[:topic]

    if (assigned_id = topic.custom_fields["assigned_to_id"].to_i) == info[:user]&.id
      TopicTrackingState.publish_assigned_private_message(topic, assigned_id)
    end

    if SiteSetting.unassign_on_group_archive && info[:group] &&
       user_id = topic.custom_fields["prev_assigned_to_id"].to_i &&
       previous_user = User.find_by(id: user_id)

      assigner = TopicAssigner.new(topic, Discourse.system_user)
      assigner.assign(previous_user, silent: true)
    end
  end

  on(:archive_message) do |info|
    topic = info[:topic]
    user_id = topic.custom_fields["assigned_to_id"].to_i

    if user_id == info[:user]&.id
      TopicTrackingState.publish_assigned_private_message(topic, user_id)
    end

    if SiteSetting.unassign_on_group_archive && info[:group] &&
       user_id && assigned_user = User.find_by(id: user_id)

      topic.custom_fields["prev_assigned_to_id"] = assigned_user.id
      topic.save!
      assigner = TopicAssigner.new(topic, Discourse.system_user)
      assigner.unassign(silent: true)
    end
  end

end
