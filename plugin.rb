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

    DiscourseAssign::Engine.routes.draw do
      put "/assign" => "assign#assign"
    end

    Discourse::Application.routes.append do
      mount ::DiscourseAssign::Engine, at: "/assign"
    end

  end
end
