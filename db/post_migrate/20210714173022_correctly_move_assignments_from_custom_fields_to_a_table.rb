# frozen_string_literal: true

class CorrectlyMoveAssignmentsFromCustomFieldsToATable < ActiveRecord::Migration[6.1]
  def up
    # An old version of 20210709101534 incorrectly imported `assignments` with
    # the topic_id and assigned_to_id columns flipped. This query deletes those invalid records.
    execute <<~SQL
      DELETE FROM assignments USING topic_custom_fields
      WHERE
        assignments.assigned_to_id = topic_custom_fields.topic_id
        AND assignments.topic_id = topic_custom_fields.value::integer
        AND topic_custom_fields.name = 'assigned_to_id'
    SQL

    execute <<~SQL
      INSERT INTO assignments (assigned_to_id, assigned_by_user_id, topic_id, created_at, updated_at)
      SELECT (
        SELECT value::integer assigned_to_id
        FROM topic_custom_fields tcf1
        WHERE tcf1.name = 'assigned_to_id' AND tcf1.topic_id = tcf2.topic_id
      ), value::integer assigned_by_id, topic_id, created_at, updated_at
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
