# frozen_string_literal: true

class EnsureNotificationsConsistency < ActiveRecord::Migration[7.0]
  def up
    Notification
      .assigned
      .joins(
        "LEFT OUTER JOIN assignments ON assignments.id = ((notifications.data::jsonb)->'assignment_id')::int",
      )
      .where(assignments: { id: nil })
      .or(Assignment.inactive)
      .destroy_all

    Assignment
      .active
      .left_joins(:topic)
      .where.not(topics: { id: nil })
      .find_each do |assignment|
        next if !assignment.target || !assignment.assigned_to
        assignment.create_missing_notifications!(mark_as_read: true)
      end
  end

  def down
  end
end
