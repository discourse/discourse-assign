# name: discourse-assign
# about: Assign users to topics
# version: 0.1
# authors: Sam Saffron

after_initialize do
  sql =<<SQL
  CREATE TABLE IF NOT EXISTS assigned_users(
    id SERIAL NOT NULL PRIMARY KEY,
    topic_id integer NOT NULL,
    assigned_to_id integer NOT NULL,
    assigned_by_id integer,
    created_at timestamp without time zone
  )
SQL

  User.exec_sql(sql)


  class ::AssignedUser < ActiveRecord::Base
    belongs_to :topic
    belongs_to :assigned_to, class_name: 'User'
    belongs_to :assigned_by, class_name: 'User'
  end

  module ::DiscourseAssign
    class Engine < ::Rails::Engine
      engine_name "discourse_assign"
      isolate_namespace DiscourseAssign
    end
  end

  class ::DiscourseAssign::AssignController < Admin::AdminController
    before_filter :ensure_logged_in

    def assign
      topic_id = params.require(:topic_id)
      username = params.require(:username)

      topic = Topic.find(topic_id.to_i)
      assign_to = User.find_by(username_lower: username.downcase)

      raise Discourse::NotFound unless assign_to

      assigned = AssignedUser.where(topic_id: topic.id).first_or_initialize
      assigned.assigned_to_id = assign_to.id
      assigned.assigned_by_id = current_user.id
      assigned.save!

      topic.add_moderator_post(current_user,
                               I18n.t('discourse_assign.assigned_to',
                                       username: assign_to.username),
                               { bump: false,
                                 post_type: Post.types[:small_action],
                                 action_code: "assigned"})

      render json: {status: "ok"}
    end

    DiscourseAssign::Engine.routes.draw do
      put "/assign" => "assign#assign"
    end

    Discourse::Application.routes.append do
      mount ::DiscourseAssign::Engine, at: "/assign"
    end

  end
end
