# frozen_string_literal: true

class AddPriorityToAssignments < ActiveRecord::Migration[6.1]
  def change
    add_column :assignments, :priority, :integer, null: true
  end
end
