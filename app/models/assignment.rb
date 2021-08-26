# frozen_string_literal: true

class Assignment < ActiveRecord::Base
  belongs_to :topic
  belongs_to :assigned_to, polymorphic: true
  belongs_to :assigned_by_user, class_name: "User"
end
