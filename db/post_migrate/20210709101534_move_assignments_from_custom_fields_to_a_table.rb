# frozen_string_literal: true

class MoveAssignmentsFromCustomFieldsToATable < ActiveRecord::Migration[6.1]
  def up
    execute <<~SQL
      INSERT INTO assignments (topic_id, assigned_by_user_id, assigned_to_id, created_at, updated_at)
      SELECT (
        SELECT value::integer assigned_to_id
        FROM topic_custom_fields tcf1
        WHERE tcf1.name = 'assigned_to_id' AND tcf1.topic_id = tcf2.topic_id
      ), value::integer assgined_by_id, topic_id, created_at, updated_at
      FROM topic_custom_fields tcf2
      WHERE name = 'assigned_by_id'
      ORDER BY created_at DESC
      ON CONFLICT DO NOTHING
    SQL
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
