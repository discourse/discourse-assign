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
        suggestions: ActiveModel::ArraySerializer.new(users, scope: guardian, each_serializer: BasicUserSerializer)
      }
    end

    def claim
      topic_id = params.require(:topic_id).to_i
      topic = Topic.find(topic_id)

      assigned_id = Assignment
        .where(topic_id: topic_id)
        .not(assigned_to_id: nil)
        .pluck_first(:assigned_to_id)

      if assigned
        if user = User.where(id: assigned_id).first
          extras = {
            assigned_to: serialize_data(user, BasicUserSerializer, root: false)
          }
        end

        return render_json_error(I18n.t('discourse_assign.already_claimed'), extras: extras)
      end

      assigner = TopicAssigner.new(topic, current_user)
      assigner.assign(current_user)
      render json: success_json
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
      username = params.require(:username)

      topic = Topic.find(topic_id.to_i)
      assign_to = User.find_by(username_lower: username.downcase)

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
        topic.preload_assigned_to_user(users_map[user_id]) if user_id
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
        .joins("LEFT OUTER JOIN assignments a ON a.assigned_to_id = users.id")
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

      assignment_count = Topic
        .joins("JOIN assignments a ON a.topic_id = topics.id AND a.assigned_to_id IS NOT NULL")
        .where("a.assigned_to_id IN (SELECT group_users.user_id FROM group_users WHERE (group_id IN (SELECT id FROM groups WHERE name = ?)))", group.name)
        .where("topics.deleted_at IS NULL")
        .count

      render json: { members: serialize_data(members, GroupUserAssignedSerializer), assignment_count: assignment_count }
    end

    private

    def translate_failure(reason, user)
      case reason
      when :already_assigned
        { error: I18n.t('discourse_assign.already_assigned', username: user.username) }
      when :forbidden_assign_to
        { error: I18n.t('discourse_assign.forbidden_assign_to', username: user.username) }
      when :forbidden_assignee_not_pm_participant
        { error: I18n.t('discourse_assign.forbidden_assignee_not_pm_participant', username: user.username) }
      when :forbidden_assignee_cant_see_topic
        { error: I18n.t('discourse_assign.forbidden_assignee_cant_see_topic', username: user.username) }
      else
        max = SiteSetting.max_assigned_topics
        { error: I18n.t('discourse_assign.too_many_assigns', username: user.username, max: max) }
      end
    end

    def ensure_assign_allowed
      raise Discourse::InvalidAccess.new unless current_user.can_assign?
    end
  end
end
