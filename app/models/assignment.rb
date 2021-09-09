# frozen_string_literal: true

class Assignment < ActiveRecord::Base
  belongs_to :topic
  belongs_to :assigned_to, polymorphic: true
  belongs_to :assigned_by_user, class_name: "User"

  def assigned_to_user?
    assigned_to_type == 'User'
  end

  def assigned_to_group?
    assigned_to_type == 'Group'
  end
end
