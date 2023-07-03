# frozen_string_literal: true

require "rails_helper"

describe Assignment do
  fab!(:group) { Fabricate(:group) }
  fab!(:user1) { Fabricate(:user) }
  fab!(:user2) { Fabricate(:user) }
  fab!(:group_user1) { Fabricate(:group_user, user: user1, group: group) }
  fab!(:group_user1) { Fabricate(:group_user, user: user2, group: group) }

  fab!(:wrong_group) { Fabricate(:group) }

  before { SiteSetting.assign_enabled = true }

  describe "#active_for_group" do
    it "returns active assignments for the group" do
      assignment1 = Fabricate(:topic_assignment, assigned_to: group)
      assignment2 = Fabricate(:post_assignment, assigned_to: group)
      Fabricate(:post_assignment, assigned_to: group, active: false)
      Fabricate(:post_assignment, assigned_to: user1)
      Fabricate(:topic_assignment, assigned_to: wrong_group)

      expect(Assignment.active_for_group(group)).to contain_exactly(assignment1, assignment2)
    end
  end
end
