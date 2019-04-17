class AddLastRemindedToUser < ActiveRecord::Migration[5.2]
  def change
    add_column :users, :last_tasks_reminder, :datetime
  end
end
