# frozen_string_literal: true

require "rails_helper"

describe Topic do
  let(:user1) { Fabricate(:user) }
  let(:user2) { Fabricate(:user) }
  let(:group) { Fabricate(:group) }
  let(:topic) { Fabricate(:topic) }

  before do
    SiteSetting.assign_enabled = true
  end

  describe "#assigned_to" do
    it "correctly points to a user" do
      Assignment.create!(topic: topic, assigned_by_user: user1, assigned_to: user2)

      expect(topic.reload.assigned_to).to eq(user2)
    end

    it "correctly points to a group" do
      Assignment.create!(topic: topic, assigned_by_user: user1, assigned_to: group)

      expect(topic.reload.assigned_to).to eq(group)
    end
  end
end
