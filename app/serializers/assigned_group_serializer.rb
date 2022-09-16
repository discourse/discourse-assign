# frozen_string_literal: true

class AssignedGroupSerializer < ApplicationSerializer
  attributes :id, :name, :assign_icon, :assign_path

  def assign_icon
    "group-plus"
  end

  def assign_path
    "/g/#{object.name}/assigned/everyone"
  end
end
