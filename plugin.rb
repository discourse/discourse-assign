# frozen_string_literal: true

# name: discourse-assign
# about: Assign users to topics
# version: 0.1
# authors: Sam Saffron
# url: https://github.com/discourse/discourse-assign

enabled_site_setting :assign_enabled

register_asset 'stylesheets/assigns.scss'
register_asset 'stylesheets/mobile/assigns.scss', :mobile

register_svg_icon "user-plus" if respond_to?(:register_svg_icon)
register_svg_icon "user-times" if respond_to?(:register_svg_icon)

load File.expand_path('../lib/discourse_assign/engine.rb', __FILE__)
load File.expand_path('../lib/discourse_assign/helpers.rb', __FILE__)

Discourse::Application.routes.append do
  mount ::DiscourseAssign::Engine, at: "/assign"
  get "topics/private-messages-assigned/:username" => "list#private_messages_assigned", as: "topics_private_messages_assigned", constraints: { username: ::RouteFormat.username }
  get "topics/messages-assigned/:username" => "list#messages_assigned", as: "topics_messages_assigned", constraints: { username: ::RouteFormat.username }
end

# TODO: Remove this once 2.4.0.beta3 is released.
# HACK: Checking if the file exists, this means we can assume the migration happenned
above_min_version = File.exist?(
  File.expand_path('../../../db/migrate/20190717133743_migrate_group_list_site_settings.rb', __FILE__)
)

after_initialize do
  require File.expand_path('../jobs/scheduled/enqueue_reminders.rb', __FILE__)
  require File.expand_path('../jobs/regular/remind_user.rb', __FILE__)
  require 'topic_assigner'
  require 'pending_assigns_reminder'

  frequency_field = PendingAssignsReminder::REMINDERS_FREQUENCY
  register_editable_user_custom_field frequency_field
  User.register_custom_field_type frequency_field, :integer
  DiscoursePluginRegistry.serialized_current_user_fields << frequency_field
  add_to_serializer(:user, :reminders_frequency) do
    RemindAssignsFrequencySiteSettings.values
  end
  add_model_callback(UserCustomField, :before_save) do
    self.value = self.value.to_i if self.name == frequency_field
  end

  # TODO: Remove this once 2.4 becomes the new stable.
  attribute = above_min_version ? 'id' : 'name'

  add_class_method(:group, :assign_allowed_groups) do
    allowed_groups = SiteSetting.assign_allowed_on_groups.split('|')
    where("groups.#{attribute} IN (?)", allowed_groups)
  end

  add_to_class(:user, :can_assign?) do
    @can_assign ||=
      begin
        return true if admin?
        allowed_groups = SiteSetting.assign_allowed_on_groups.split('|').compact
        allowed_groups.present? && groups.where("groups.#{attribute} in (?)", allowed_groups).exists? ?
          :true : :false
      end
    @can_assign == :true
  end

  add_to_class(:guardian, :can_assign?) { user && user.can_assign? }

  add_class_method(:user, :assign_allowed) do
    allowed_groups = SiteSetting.assign_allowed_on_groups.split('|')
    where("users.id IN (
      SELECT user_id FROM group_users
      INNER JOIN groups ON group_users.group_id = groups.id
      WHERE groups.#{attribute} IN (?)
    )", allowed_groups)
  end

  add_model_callback(Group, :before_update) do
    if !above_min_version && name_changed?
      SiteSetting.assign_allowed_on_groups = SiteSetting.assign_allowed_on_groups.gsub(name_was, name)
    end
  end

  add_model_callback(Group, :before_destroy) do
    to_remove = above_min_version ? id : name
    new_setting = SiteSetting.assign_allowed_on_groups.gsub(/#{to_remove}[|]?/, '')
    new_setting = new_setting.chomp('|') if new_setting.ends_with?('|')
    SiteSetting.assign_allowed_on_groups = new_setting
  end

  DiscourseEvent.on(:assign_topic) do |topic, user, assigning_user, force|
    if force || !topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID]
      TopicAssigner.new(topic, assigning_user).assign(user)
    end
  end

  DiscourseEvent.on(:unassign_topic) do |topic, unassigning_user|
    TopicAssigner.new(topic, unassigning_user).unassign
  end

  TopicList.preloaded_custom_fields << TopicAssigner::ASSIGNED_TO_ID

  TopicList.on_preload do |topics, topic_list|
    if SiteSetting.assign_enabled?
      can_assign = topic_list.current_user && topic_list.current_user.can_assign?
      allowed_access = SiteSetting.assigns_public || can_assign

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
          if id = t.custom_fields[TopicAssigner::ASSIGNED_TO_ID]
            t.preload_assigned_to_user(map[id.to_i])
          end
        end
      end
    end
  end

  require_dependency 'topic_query'
  TopicQuery.add_custom_filter(:assigned) do |results, topic_query|
    if topic_query.guardian.can_assign? || SiteSetting.assigns_public
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
    generate_message_route(:messages_assigned)
  end

  add_to_class(:topic_query, :list_messages_assigned) do |user|
    list = joined_topic_user.where("
      topics.id IN (
        SELECT topic_id FROM topic_custom_fields
        WHERE name = 'assigned_to_id'
        AND value = ?)
    ", user.id.to_s)
      .order("topics.bumped_at DESC")

    create_list(:assigned, {}, list)
  end

  add_to_class(:topic_query, :list_private_messages_assigned) do |user|
    list = private_messages_assigned_query(user)
    create_list(:private_messages, {}, list)
  end

  add_to_class(:topic_query, :private_messages_assigned_query) do |user|
    list = private_messages_for(user, :all)

    list = list.where("
      topics.id IN (
        SELECT topic_id FROM topic_custom_fields
        WHERE name = 'assigned_to_id'
        AND value = ?)
    ", user.id.to_s)
  end

  add_to_class(:topic, :assigned_to_user) do
    @assigned_to_user ||
      if user_id = custom_fields[TopicAssigner::ASSIGNED_TO_ID]
        @assigned_to_user = User.find_by(id: user_id)
      end
  end

  add_to_class(:topic, :preload_assigned_to_user) do |assigned_to_user|
    @assigned_to_user = assigned_to_user
  end

  add_to_serializer(:topic_list, :assigned_messages_count) do
    TopicQuery.new(object.current_user, guardian: scope, limit: false)
      .private_messages_assigned_query(object.current_user)
      .count
  end

  add_to_serializer(:topic_list, 'include_assigned_messages_count?') do
    options = object.instance_variable_get(:@opts)

    if assigned_user = options.dig(:assigned)
      scope.can_assign? ||
        assigned_user.downcase == scope.current_user&.username_lower
    end
  end

  add_to_serializer(:topic_view, :assigned_to_user, false) do
    DiscourseAssign::Helpers.build_assigned_to_user(assigned_to_user_id, object.topic)
  end

  add_to_serializer(:topic_list_item, 'include_assigned_to_user?') do
    (SiteSetting.assigns_public || scope.can_assign?) && object.assigned_to_user
  end

  add_to_serializer(:topic_view, 'include_assigned_to_user?') do
    if SiteSetting.assigns_public || scope.can_assign?
      # subtle but need to catch cases where stuff is not assigned
      object.topic.custom_fields.keys.include?(TopicAssigner::ASSIGNED_TO_ID)
    end
  end

  add_to_serializer(:current_user, :can_assign) do
    object.can_assign?
  end

  add_to_class(:topic_view_serializer, :assigned_to_user_id) do
    id = object.topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID]
    # a bit messy but race conditions can give us an array here, avoid
    id && id.to_i rescue nil
  end

  add_to_serializer(:flagged_topic, :assigned_to_user) do
    DiscourseAssign::Helpers.build_assigned_to_user(assigned_to_user_id, object)
  end

  add_to_serializer(:flagged_topic, :assigned_to_user_id) do
    id = object.custom_fields[TopicAssigner::ASSIGNED_TO_ID]
    # a bit messy but race conditions can give us an array here, avoid
    id && id.to_i rescue nil
  end

  on(:post_created) do |post|
    ::TopicAssigner.auto_assign(post, force: true)
  end

  on(:post_edited) do |post, topic_changed|
    ::TopicAssigner.auto_assign(post, force: true)
  end

  on(:topic_status_updated) do |topic, status, enabled|
    if SiteSetting.unassign_on_close && (status == 'closed' || status == 'autoclosed') && enabled
      assigner = ::TopicAssigner.new(topic, Discourse.system_user)
      assigner.unassign(silent: true)
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

    if (assigned_id = topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID].to_i) == info[:user]&.id
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
    user_id = topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID].to_i

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
