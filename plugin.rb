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

      assigned = AssignedUser.where(topic_id: topic_id).first_or_initialize
      assigned.assigned_to_id = User.where(username_lower: username.downcase).pluck(:id).first
      assigned.assigned_by_id = current_user.id
      assigned.save!

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
