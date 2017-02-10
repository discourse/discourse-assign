# name: discourse-assign
# about: Assign users to topics
# version: 0.1
# authors: Sam Saffron

after_initialize do

  module ::DiscourseAssign
    class Engine < ::Rails::Engine
      engine_name "discourse_assign"
      isolate_namespace DiscourseAssign
    end
  end

  class ::DiscourseAssign::AssignController < Admin::AdminController
    before_filter :ensure_logged_in

    def unassign
      _topic_id = params.require(:topic_id)
    end

    def assign
      topic_id = params.require(:topic_id)
      username = params.require(:username)

      topic = Topic.find(topic_id.to_i)
      assign_to = User.find_by(username_lower: username.downcase)

      raise Discourse::NotFound unless assign_to

      topic.custom_fields["assigned_to_id"] = assign_to.id
      topic.custom_fields["assigned_by_id"] = current_user.id
      topic.save!

      #Scheduler::Defer.later "add moderator post" do

        UserAction.log_action!(action_type: UserAction::ASSIGNED,
                              user_id: assign_to.id,
                              acting_user_id: current_user.id,
                              target_post_id: topic.posts.find_by(post_number: 1).id,
                              target_topic_id: topic.id)

        topic.add_moderator_post(current_user,
                                 I18n.t('discourse_assign.assigned_to',
                                         username: assign_to.username),
                                 { bump: false,
                                   post_type: Post.types[:small_action],
                                   action_code: "assigned"})

        unless false && current_user.id == assign_to.id

          Notification.create!(notification_type: Notification.types[:custom],
                             user_id: assign_to.id,
                             topic_id: topic.id,
                             post_number: 1,
                             data: {
                               message: 'discourse_assign.assign_notification',
                               display_username: current_user.username,
                               topic_title: topic.title
                             }.to_json
                            )
        end

      #end

      render json: success_json
    end

    require_dependency 'topic_view_serializer'
    class ::TopicViewSerializer
      attributes :assigned_to_user

      def assigned_to_user
        if user = User.find_by(id: assigned_to_user_id)

          assigned_at = TopicCustomField.where(
            topic_id: object.topic.id,
            name: "assigned_to_id"
          ).pluck(:created_at).first

          {
            username: user.username,
            name: user.name,
            avatar_template: user.avatar_template,
            assigned_at: assigned_at
          }
        end
      end

      def include_assigned_to_user?
        assigned_to_user_id
      end

      def assigned_to_user_id
        id = object.topic.custom_fields["assigned_to_id"]
        # a bit messy but race conditions can give us an array here, avoid
        id && id.to_i rescue nil
      end
    end

    DiscourseAssign::Engine.routes.draw do
      put "/assign" => "assign#assign"
    end

    Discourse::Application.routes.append do
      mount ::DiscourseAssign::Engine, at: "/assign"
    end

  end
end
