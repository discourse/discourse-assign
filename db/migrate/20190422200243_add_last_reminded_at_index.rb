class AddLastRemindedAtIndex < ActiveRecord::Migration[5.2]
  def up
    execute <<~SQL
    CREATE UNIQUE INDEX idx_last_reminded_at
    ON user_custom_fields(name, user_id)
    WHERE name = 'last_reminded_at'
    SQL
  end

  def down
    execute "DROP INDEX idx_last_reminded_at"
  end
end
