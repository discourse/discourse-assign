# frozen_string_literal: true

class RemoveNilCustomFields < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL
      DELETE FROM topic_custom_fields
      WHERE name = 'assigned_to_id' AND value IS NULL
    SQL

    execute <<~SQL
      DELETE FROM topic_custom_fields
      WHERE name = 'assigned_by_id' AND value IS NULL
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
