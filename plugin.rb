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

  # We can remove this check once this method is stable
  if respond_to?(:add_preloaded_topic_list_custom_field)
    add_preloaded_topic_list_custom_field('assigned_to_id')
  else
    TopicList.preloaded_custom_fields << "assigned_to_id"
  end

  TopicList.on_preload do |topics, topic_list|
    is_staff = topic_list.current_user && topic_list.current_user.staff?
    allowed_access = SiteSetting.assigns_public || is_staff

    if allowed_access && topics.length > 0
      users = User.where("users.id in (
            SELECT value::int
            FROM topic_custom_fields
            WHERE name = 'assigned_to_id' AND topic_id IN (?)
      )", topics.map(&:id))
        .joins('join user_emails on user_emails.user_id = users.id AND user_emails.primary')
        .select(:id, 'user_emails.email', :username, :uploaded_avatar_id)

      map = {}
      users.each { |u| map[u.id] = u }

      topics.each do |t|
        if id = t.custom_fields['assigned_to_id']
          t.preload_assigned_to_user(map[id.to_i])
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

  on(:move_to_inbox) do |info|
    if SiteSetting.unassign_on_group_archive && info[:group]
      if topic = info[:topic]
        if user_id = topic.custom_fields["prev_assigned_to_id"]
          if user = User.find_by(id: user_id.to_i)
            assigner = TopicAssigner.new(topic, Discourse.system_user)
            assigner.assign(user, silent: true)
          end
        end
      end
    end
  end

  on(:archive_message) do |info|
    if SiteSetting.unassign_on_group_archive && info[:group]
      topic = info[:topic]
      if user_id = topic.custom_fields["assigned_to_id"]
        if user = User.find_by(id: user_id.to_i)
          topic.custom_fields["prev_assigned_to_id"] = user.id
          topic.save
          assigner = TopicAssigner.new(topic, Discourse.system_user)
          assigner.unassign(silent: true)
        end
      end
    end
  end

end
