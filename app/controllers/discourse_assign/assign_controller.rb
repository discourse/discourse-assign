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
                SELECT value::integer user_id, MAX(created_at) last_assigned
                FROM topic_custom_fields
                WHERE name = 'assigned_to_id'
                GROUP BY value::integer
                HAVING COUNT(*) < #{SiteSetting.max_assigned_topics}
              ) as X ON X.user_id = users.id
        SQL
        )
        .assign_allowed
        .order('X.last_assigned DESC')
        .limit(6)

      render json: {
        assign_allowed_on_groups: Group.assign_allowed_groups.pluck(:name),
        suggestions: ActiveModel::ArraySerializer.new(users, scope: guardian, each_serializer: BasicUserSerializer)
      }
    end

    def claim
      topic_id = params.require(:topic_id).to_i
      topic = Topic.find(topic_id)

      assigned = TopicCustomField.where(
        "topic_id = :topic_id AND name = 'assigned_to_id' AND value IS NOT NULL",
        topic_id: topic_id
      ).pluck(:value)

      if assigned && user_id = assigned[0]
        extras = nil
        if user = User.where(id: user_id).first
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

    private

    def translate_failure(reason, user)
      case reason
      when :already_assigned
        { error: I18n.t('discourse_assign.already_assigned', username: user.username) }
      when :forbidden_assign_to
        { error: I18n.t('discourse_assign.forbidden_assign_to', username: user.username) }
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
