module DiscourseAssign
  class AssignController < Admin::AdminController
    before_action :ensure_logged_in

    def suggestions
      users = [current_user]
      users += User
        .where('admin OR moderator')
        .where('users.id <> ?', current_user.id)
        .joins("join (
                       SELECT value::integer user_id, MAX(created_at) last_assigned
                       FROM topic_custom_fields
                       WHERE name = 'assigned_to_id'
                       GROUP BY value::integer
                      ) as X ON X.user_id = users.id")
        .order('X.last_assigned DESC')
        .limit(6)

      render json: ActiveModel::ArraySerializer.new(users,
                                                    scope: guardian, each_serializer: BasicUserSerializer)
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

      assigner = TopicAssigner.new(topic, current_user)

      # perhaps?
      #Scheduler::Defer.later "assign topic" do
      assigner.assign(assign_to)

      render json: success_json
    end
  end
end
