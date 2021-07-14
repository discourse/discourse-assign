# frozen_string_literal: true

require "rails_helper"
require_relative "../../../db/post_migrate/20210714173022_correctly_move_assignments_from_custom_fields_to_a_table"

describe CorrectlyMoveAssignmentsFromCustomFieldsToATable do
  context "valid data" do
    it "should migrate the data correctly" do
      TopicCustomField.create!(topic_id: 99, name: "assigned_to_id", value: "50")
      TopicCustomField.create!(topic_id: 99, name: "assigned_by_id", value: "60")
      silence_stdout { CorrectlyMoveAssignmentsFromCustomFieldsToATable.new.up }

      assignment = Assignment.first
      expect(assignment.topic_id).to eq(99)
      expect(assignment.assigned_to_id).to eq(50)
      expect(assignment.assigned_by_user_id).to eq(60)
    end
  end

  context "no assigned_by data" do
    it "should migrate the data correctly" do
      TopicCustomField.create!(topic_id: 99, name: "assigned_to_id", value: "50")
      silence_stdout { CorrectlyMoveAssignmentsFromCustomFieldsToATable.new.up }

      expect(Assignment.count).to eq(0)
    end
  end

  context "no assigned_to data" do
    it "should migrate the data correctly" do
      TopicCustomField.create!(topic_id: 99, name: "assigned_by_id", value: "60")
      silence_stdout { CorrectlyMoveAssignmentsFromCustomFieldsToATable.new.up }

      expect(Assignment.count).to eq(0)
    end
  end
end
