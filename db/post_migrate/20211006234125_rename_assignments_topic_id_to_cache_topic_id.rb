# frozen_string_literal: true

class RenameAssignmentsTopicIdToCacheTopicId < ActiveRecord::Migration[6.1]
  def up
    rename_column :assignments, :topic_id, :cache_topic_id
  end

  def down
    rename_column :assignments, :cache_topic_id, :topic_id
  end
end
