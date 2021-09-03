# frozen_string_literal: true

module DiscourseAssign
  class AssignController < ApplicationController
    requires_login
    before_action :ensure_logged_in, :ensure_assign_allowed

    def suggestions
      users = [current_user]
      users += User
        .where('users.id <> ?', current_user.id)
        .joins(<<~SQL
          JOIN(
            SELECT assigned_to_id user_id, MAX(created_at) last_assigned
            FROM assignments
            WHERE assignments.assigned_to_type = 'User'
            GROUP BY assigned_to_id
            HAVING COUNT(*) < #{SiteSetting.max_assigned_topics}
          ) as X ON X.user_id = users.id
        SQL
        )
        .assign_allowed
        .order('X.last_assigned DESC')
        .limit(6)

      render json: {
        assign_allowed_on_groups: Group.visible_groups(current_user).assign_allowed_groups.pluck(:name),
        assign_allowed_for_groups: Group.visible_groups(current_user).assignable(current_user).pluck(:name),
        suggestions: ActiveModel::ArraySerializer.new(users, scope: guardian, each_serializer: BasicUserSerializer),
      }
    end

    def unassign
      topic_id = params.require(:topic_id)
      topic = Topic.find(topic_id.to_i)
      assigner = TopicAssigner.new(topic, current_user)
      assigner.unassign

      render json: success_json
    end

    def assign
      topic_id = params.require(:topic_id)
      username = params.permit(:username)['username']
      group_name = params.permit(:group_name)['group_name']

      topic = Topic.find(topic_id.to_i)
      assign_to = username.present? ? User.find_by(username_lower: username.downcase) : Group.where("LOWER(name) = ?", group_name.downcase).first

      raise Discourse::NotFound unless assign_to

      # perhaps?
      #Scheduler::Defer.later "assign topic" do
      assign = TopicAssigner.new(topic, current_user).assign(assign_to)

      if assign[:success]
        render json: success_json
      else
        render json: translate_failure(assign[:reason], assign_to), status: 400
      end
    end

    def assigned
      raise Discourse::InvalidAccess unless current_user&.admin?

      offset = (params[:offset] || 0).to_i
      limit = (params[:limit] || 100).to_i

      topics = Topic
        .includes(:tags)
        .includes(:user)
        .joins("JOIN assignments a ON a.topic_id = topics.id AND a.assigned_to_id IS NOT NULL")
        .order("a.assigned_to_id, topics.bumped_at desc")
        .offset(offset)
        .limit(limit)

      Topic.preload_custom_fields(topics, TopicList.preloaded_custom_fields)

      assignments = Assignment.where(topic: topics).pluck(:topic_id, :assigned_to_id).to_h

      users = User
        .where("users.id IN (?)", assignments.values.uniq)
        .joins("join user_emails on user_emails.user_id = users.id AND user_emails.primary")
        .select(UserLookup.lookup_columns)
        .to_a

      User.preload_custom_fields(users, User.allowed_user_custom_fields(guardian))

      users_map = users.index_by(&:id)

      topics.each do |topic|
        user_id = assignments[topic.id]
        topic.preload_assigned_to(users_map[user_id]) if user_id
      end

      render json: { topics: serialize_data(topics, AssignedTopicSerializer) }
    end

    def group_members
      limit = (params[:limit] || 50).to_i
      offset = params[:offset].to_i

      raise Discourse::InvalidParameters.new(:limit) if limit < 0 || limit > 1000
      raise Discourse::InvalidParameters.new(:offset) if offset < 0
      raise Discourse::NotFound.new if !params[:group_name].present?

      group = Group.find_by(name: params[:group_name])

      guardian.ensure_can_see_group_members!(group)

      members = User
        .joins("LEFT OUTER JOIN group_users g ON g.user_id = users.id")
        .joins("LEFT OUTER JOIN assignments a ON a.assigned_to_id = users.id AND a.assigned_to_type = 'User'")
        .joins("LEFT OUTER JOIN topics t ON t.id = a.topic_id")
        .where("g.group_id = ? AND users.id > 0 AND t.deleted_at IS NULL", group.id)
        .where("a.assigned_to_id IS NOT NULL")
        .order('COUNT(users.id) DESC')
        .group('users.id')
        .select('users.*, COUNT(users.id) as "assignments_count"')
        .limit(limit)
        .offset(offset)

      if params[:filter]
        members = members.where(<<~SQL, pattern: "%#{params[:filter]}%")
          users.name ILIKE :pattern OR users.username_lower ILIKE :pattern
        SQL
      end

      group_assignment_count = Topic
        .joins("JOIN assignments a ON a.topic_id = topics.id AND a.assigned_to_id IS NOT NULL ")
        .where(<<~SQL, group_id: group.id)
          a.assigned_to_id = :group_id AND a.assigned_to_type = 'Group'
        SQL
        .where("topics.deleted_at IS NULL")
        .count

      assignment_count = Topic
        .joins("JOIN assignments a ON a.topic_id = topics.id AND a.assigned_to_id IS NOT NULL ")
        .where(<<~SQL, group_id: group.id)
          a.assigned_to_id IN (SELECT group_users.user_id FROM group_users WHERE group_id = :group_id) AND a.assigned_to_type = 'User'
        SQL
        .where("topics.deleted_at IS NULL")
        .count

      render json: {
        members: serialize_data(members, GroupUserAssignedSerializer),
        assignment_count: assignment_count + group_assignment_count,
        group_assignment_count: group_assignment_count
      }
    end

    private

    def translate_failure(reason, assign_to)
      case reason
      when :already_assigned
        { error: I18n.t('discourse_assign.already_assigned', username: assign_to.username) }
      when :forbidden_assign_to
        { error: I18n.t('discourse_assign.forbidden_assign_to', username: assign_to.username) }
      when :forbidden_assignee_not_pm_participant
        { error: I18n.t('discourse_assign.forbidden_assignee_not_pm_participant', username: assign_to.username) }
      when :forbidden_assignee_cant_see_topic
        { error: I18n.t('discourse_assign.forbidden_assignee_cant_see_topic', username: assign_to.username) }
      when :group_already_assigned
        { error: I18n.t('discourse_assign.group_already_assigned', group: assign_to.name) }
      when :forbidden_group_assign_to
        { error: I18n.t('discourse_assign.forbidden_group_assign_to', group: assign_to.name) }
      when :forbidden_group_assignee_not_pm_participant
        { error: I18n.t('discourse_assign.forbidden_group_assignee_not_pm_participant', group: assign_to.name) }
      when :forbidden_group_assignee_cant_see_topic
        { error: I18n.t('discourse_assign.forbidden_group_assignee_cant_see_topic', group: assign_to.name) }
      else
        max = SiteSetting.max_assigned_topics
        { error: I18n.t('discourse_assign.too_many_assigns', username: assign_to.username, max: max) }
      end
    end

    def ensure_assign_allowed
      raise Discourse::InvalidAccess.new unless current_user.can_assign?
    end
  end
end
