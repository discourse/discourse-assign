# name: discourse-assigns
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
end
