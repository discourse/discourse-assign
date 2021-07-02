# frozen_string_literal: true

# name: discourse-assign
# about: Assign users to topics
# version: 1.0.0
# authors: Sam Saffron
# url: https://github.com/discourse/discourse-assign

enabled_site_setting :assign_enabled

register_asset 'stylesheets/assigns.scss'
register_asset 'stylesheets/mobile/assigns.scss', :mobile

register_svg_icon "user-plus"
register_svg_icon "user-times"

load File.expand_path('../lib/discourse_assign/engine.rb', __FILE__)
load File.expand_path('../lib/discourse_assign/helpers.rb', __FILE__)

Discourse::Application.routes.append do
  mount ::DiscourseAssign::Engine, at: "/assign"
  get "topics/private-messages-assigned/:username" => "list#private_messages_assigned", as: "topics_private_messages_assigned", constraints: { username: ::RouteFormat.username }
  get "/topics/messages-assigned/:username" => "list#messages_assigned", constraints: { username: ::RouteFormat.username }, as: "messages_assigned"
  get "/topics/group-topics-assigned/:groupname" => "list#group_topics_assigned", constraints: { username: ::RouteFormat.username }, as: "group_topics_assigned"
  get "/g/:id/assigned" => "groups#index"
  get "/g/:id/assigned/:route_type" => "groups#index"
end

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

  add_to_serializer(:group_show, :assignment_count) do
    Topic.joins("JOIN topic_custom_fields tcf ON topics.id = tcf.topic_id AND tcf.name = 'assigned_to_id' AND tcf.value IS NOT NULL")
      .where("tcf.value IN (SELECT group_users.user_id::varchar(255) FROM group_users WHERE (group_id IN (SELECT id FROM groups WHERE name = ?)))", object.name)
      .where("topics.deleted_at IS NULL")
      .count
  end

  add_to_serializer(:group_show, 'include_assignment_count?') do
    scope.can_assign?
  end

  add_to_serializer(:group_show, :can_show_assigned_tab?) do
    object.can_show_assigned_tab?
  end

  add_model_callback(UserCustomField, :before_save) do
    self.value = self.value.to_i if self.name == frequency_field
  end

  add_class_method(:group, :assign_allowed_groups) do
    allowed_groups = SiteSetting.assign_allowed_on_groups.split('|')
    where(id: allowed_groups)
  end

  add_to_class(:user, :can_assign?) do
    @can_assign ||=
      begin
        return true if admin?
        allowed_groups = SiteSetting.assign_allowed_on_groups.split('|').compact
        allowed_groups.present? && groups.where(id: allowed_groups).exists? ?
          :true : :false
      end
    @can_assign == :true
  end

  add_to_class(:group, :can_show_assigned_tab?) do
    allowed_group_ids = SiteSetting.assign_allowed_on_groups.split("|")

    group_has_disallowed_users = DB.query_single(<<~SQL, allowed_group_ids: allowed_group_ids, current_group_id: self.id)[0]
      SELECT EXISTS(
        SELECT 1 FROM users
        JOIN group_users current_group_users
          ON current_group_users.user_id=users.id
          AND current_group_users.group_id = :current_group_id
        LEFT JOIN group_users allowed_group_users
          ON allowed_group_users.user_id=users.id
          AND allowed_group_users.group_id IN (:allowed_group_ids)
        WHERE allowed_group_users.user_id IS NULL
      )
    SQL

    !group_has_disallowed_users
  end

  add_to_class(:guardian, :can_assign?) { user && user.can_assign? }

  add_class_method(:user, :assign_allowed) do
    allowed_groups = SiteSetting.assign_allowed_on_groups.split('|')
    where("users.admin OR users.id IN (
      SELECT user_id FROM group_users
      INNER JOIN groups ON group_users.group_id = groups.id
      WHERE groups.id IN (?)
    )", allowed_groups)
  end

  add_model_callback(Group, :before_update) do
    if name_changed?
      SiteSetting.assign_allowed_on_groups = SiteSetting.assign_allowed_on_groups.gsub(name_was, name)
    end
  end

  add_model_callback(Group, :before_destroy) do
    new_setting = SiteSetting.assign_allowed_on_groups.gsub(/#{id}[|]?/, '')
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
  Site.preloaded_category_custom_fields << "enable_unassigned_filter"
  Search.preloaded_topic_custom_fields << TopicAssigner::ASSIGNED_TO_ID

  BookmarkQuery.preloaded_custom_fields << TopicAssigner::ASSIGNED_TO_ID
  BookmarkQuery.on_preload do |bookmarks, bookmark_query|
    if SiteSetting.assign_enabled?
      assigned_user_ids = bookmarks.map(&:topic).map { |topic| topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID] }.compact.uniq
      assigned_users = User.where(id: assigned_user_ids).index_by(&:id)

      bookmarks.each do |bookmark|
        bookmark.topic.preload_assigned_to_user(
          assigned_users[bookmark.topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID]]
        )
      end
    end
  end

  TopicList.on_preload do |topics, topic_list|
    if SiteSetting.assign_enabled?
      can_assign = topic_list.current_user && topic_list.current_user.can_assign?
      allowed_access = SiteSetting.assigns_public || can_assign

      if allowed_access && topics.length > 0
        users = User
          .where(<<~SQL, topic_ids: topics.map(&:id))
            users.id in (
              SELECT value::int
              FROM topic_custom_fields
              WHERE name = 'assigned_to_id' AND topic_id IN (:topic_ids)
            )
          SQL
          .select(UserLookup.lookup_columns)

        users_map = users.index_by(&:id)

        topics.each do |t|
          if id = t.custom_fields[TopicAssigner::ASSIGNED_TO_ID]
            t.preload_assigned_to_user(users_map[id.to_i])
          end
        end
      end
    end
  end

  Search.on_preload do |results, search|
    if SiteSetting.assign_enabled?
      can_assign = search.guardian&.can_assign?
      allowed_access = SiteSetting.assigns_public || can_assign

      if allowed_access && results.posts.length > 0
        assigned_user_ids = results.posts.map(&:topic).map { |topic| topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID] }.compact.uniq
        assigned_users = User.where(id: assigned_user_ids).index_by(&:id)
        results.posts.each do |post|
          post.topic.preload_assigned_to_user(
            assigned_users[post.topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID]]
          )
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
  end

  add_to_class(:topic_query, :list_messages_assigned) do |user|
    list = default_results(include_pms: true)

    list = list.where("
      topics.id IN (
        SELECT topic_id FROM topic_custom_fields
        WHERE name = 'assigned_to_id'
        AND value = ?)
    ", user.id.to_s)

    create_list(:assigned, { unordered: true }, list)
  end

  add_to_class(:list_controller, :messages_assigned) do
    user = User.find_by_username(params[:username])
    raise Discourse::NotFound unless user
    raise Discourse::InvalidAccess unless current_user.can_assign?

    list_opts = build_topic_list_options
    list = generate_list_for("messages_assigned", user, list_opts)

    list.more_topics_url = construct_url_with(:next, list_opts)
    list.prev_topics_url = construct_url_with(:prev, list_opts)

    respond_with_list(list)
  end

  add_to_class(:topic_query, :list_group_topics_assigned) do |group|
    list = default_results(include_pms: true)

    list = list.where("
      topics.id IN (
        SELECT topic_id FROM topic_custom_fields
        WHERE name = 'assigned_to_id'
        AND value IN (SELECT user_id::varchar(255) from group_users where group_id = ?))
    ", group.id.to_s)

    create_list(:assigned, { unordered: true }, list)
  end

  add_to_class(:list_controller, :group_topics_assigned) do
    group = Group.find_by("name = ?", params[:groupname])
    guardian.ensure_can_see_group_members!(group)

    raise Discourse::NotFound unless group
    raise Discourse::InvalidAccess unless current_user.can_assign?
    raise Discourse::InvalidAccess unless group.can_show_assigned_tab?

    list_opts = build_topic_list_options
    list = generate_list_for("group_topics_assigned", group, list_opts)

    list.more_topics_url = construct_url_with(:next, list_opts)
    list.prev_topics_url = construct_url_with(:prev, list_opts)

    respond_with_list(list)
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

  add_to_serializer(:search_topic_list_item, :assigned_to_user, false) do
    object.assigned_to_user
  end

  add_to_serializer(:search_topic_list_item, 'include_assigned_to_user?') do
    (SiteSetting.assigns_public || scope.can_assign?) && object.assigned_to_user
  end

  TopicsBulkAction.register_operation("assign") do
    if @user.can_assign?
      assign_user = User.find_by_username(@operation[:username])
      topics.each do |t|
        TopicAssigner.new(t, @user).assign(assign_user)
      end
    end
  end

  TopicsBulkAction.register_operation("unassign") do
    if @user.can_assign?
      topics.each do |t|
        if guardian.can_assign?
          TopicAssigner.new(t, @user).unassign
        end
      end
    end
  end

  register_permitted_bulk_action_parameter :username

  add_to_class(:user_bookmark_serializer, :assigned_to_user_id) do
    id = topic.custom_fields[TopicAssigner::ASSIGNED_TO_ID]
    # a bit messy but race conditions can give us an array here, avoid
    id && id.to_i rescue nil
  end

  add_to_serializer(:user_bookmark, :assigned_to_user, false) do
    topic.assigned_to_user
  end

  add_to_serializer(:user_bookmark, 'include_assigned_to_user?') do
    (SiteSetting.assigns_public || scope.can_assign?) && topic.assigned_to_user
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

  add_custom_reviewable_filter(
    [
      :assigned_to,
      Proc.new do |results, value|
        results.joins(<<~SQL
          INNER JOIN posts p ON p.id = target_id
          INNER JOIN topics t ON t.id = p.topic_id
          INNER JOIN topic_custom_fields tcf ON tcf.topic_id = t.id
          INNER JOIN users u ON u.id = tcf.value::integer
        SQL
        )
        .where(target_type: Post.name)
        .where('tcf.name = ?', TopicAssigner::ASSIGNED_TO_ID)
        .where('u.username = ?', value)
      end
    ]
  )

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

  class ::WebHook
    def self.enqueue_assign_hooks(event, payload)
      if active_web_hooks('assign').exists?
        WebHook.enqueue_hooks(:assign, event,
          payload: payload
        )
      end
    end
  end

  register_search_advanced_filter(/in:assigned/) do |posts|
    if @guardian.can_assign?
      posts.where("topics.id IN (
        SELECT tc.topic_id
        FROM topic_custom_fields tc
        WHERE tc.name = 'assigned_to_id' AND
                        tc.value IS NOT NULL
        )")
    end
  end

  register_search_advanced_filter(/in:unassigned/) do |posts|
    if @guardian.can_assign?
      posts.where("topics.id NOT IN (
        SELECT tc.topic_id
        FROM topic_custom_fields tc
        WHERE tc.name = 'assigned_to_id' AND
                        tc.value IS NOT NULL
        )")
    end
  end

  register_search_advanced_filter(/assigned:(.+)$/) do |posts, match|
    if @guardian.can_assign?
      if user_id = User.find_by_username(match)&.id
        posts.where("topics.id IN (
          SELECT tc.topic_id
          FROM topic_custom_fields tc
          WHERE tc.name = 'assigned_to_id' AND
                          tc.value IS NOT NULL AND
                          tc.value::int = #{user_id}
          )")
      end
    end
  end

  on(:user_removed_from_group) do |user, group|
    assign_allowed_groups = SiteSetting.assign_allowed_on_groups.split('|').map(&:to_i)

    if assign_allowed_groups.include?(group.id)
      groups = GroupUser.where(user: user).pluck(:group_id)

      if (groups & assign_allowed_groups).empty?
        topics = Topic.joins(:_custom_fields)
          .where(
            'topic_custom_fields.name = ? AND topic_custom_fields.value = ?',
            TopicAssigner::ASSIGNED_TO_ID, user.id.to_s
          )

        topics.each do |topic|
          TopicAssigner.new(topic, Discourse.system_user).unassign
        end
      end
    end
  end

  if defined?(DiscourseAutomation)
    require 'random_assign_utils'

    add_automation_scriptable('random_assign') do
      field :assignees_group, component: :group
      field :assigned_topic, component: :text
      field :minimum_time_between_assignments, component: :text

      version 1

      triggerables %i[point_in_time recurring]

      script do |context, fields|
        next unless SiteSetting.assign_enabled?

        next unless topic_id = fields.dig('assigned_topic', 'value')
        next unless topic = Topic.find_by(id: topic_id)

        next unless group_id = fields.dig('assignees_group', 'value')
        next unless group = Group.find_by(id: group_id)

        min_hours = (fields.dig('minimum_time_between_assignments', 'value') || 12).to_i
        if TopicCustomField
            .where(name: 'assigned_to_id', topic_id: topic_id)
            .where('created_at < ?', min_hours.hours.ago)
            .exists?
          next
        end

        users_on_holiday = Set.new(
          User
            .where(id:
              UserCustomField
              .where(name: 'on_holiday', value: 't')
              .pluck(:user_id)
            ).pluck(:id)
        )

        group_users_ids = group
          .group_users
          .joins(:user)
          .pluck('users.id')
          .reject { |user_id| users_on_holiday.include?(user_id) }

        if group_users_ids.empty?
          RandomAssignUtils.no_one!(topic_id, group.name)
          next
        end

        last_assignees_ids = UserAction
          .joins(:user)
          .where(action_type: UserAction::ASSIGNED, target_topic_id: topic_id)
          .where('user_actions.created_at > ?', 6.months.ago)
          .order(created_at: :desc)
          .limit(group_users_ids.length)
          .pluck('users.id')
          .uniq

        users_ids = group_users_ids - last_assignees_ids
        if users_ids.blank?
          recently_assigned_users_ids = UserAction
            .joins(:user)
            .where(action_type: UserAction::ASSIGNED, target_topic_id: topic_id)
            .where('user_actions.created_at < ?', 2.weeks.ago)
            .pluck('users.id')
            .uniq
          users_ids = group_users_ids - recently_assigned_users_ids
        end

        if users_ids.blank?
          RandomAssignUtils.no_one!(topic_id, group.name)
          next
        end

        assign_to_user_id = users_ids.shuffle.find do |user_id|
          RandomAssignUtils.in_working_hours?(user_id)
        end

        if assign_to_user_id.blank?
          RandomAssignUtils.no_one!(topic_id, group.name)
          next
        end

        assign_to = User.find_by(id: assign_to_user_id)
        assign_to && TopicAssigner.new(topic, Discourse.system_user).assign(assign_to)
      end
    end
  end
end
