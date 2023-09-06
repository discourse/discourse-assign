# frozen_string_literal: true

require "rails_helper"
require Rails.root.join(
          "plugins/discourse-assign/db/post_migrate/20231011152903_ensure_notifications_consistency",
        )

# As this post migration is calling app code, we want to ensure its behavior
# won’t change over time.
RSpec.describe EnsureNotificationsConsistency do
  describe "#up" do
    subject(:migrate) { described_class.new.up }

    context "when notification targeting a non-existing assignment exists" do
      let(:post) { Fabricate(:post) }
      let!(:notifications) do
        Fabricate(
          :notification,
          notification_type: Notification.types[:assigned],
          post: post,
          data: { assignment_id: 1 }.to_json,
        )
      end

      it "deletes it" do
        expect { migrate }.to change { Notification.count }.by(-1)
      end
    end

    context "when notification targeting an inactive assignment exists" do
      let(:post) { Fabricate(:post) }
      let(:assignment) { Fabricate(:topic_assignment, topic: post.topic, active: false) }
      let!(:notifications) do
        Fabricate(
          :notification,
          notification_type: Notification.types[:assigned],
          post: post,
          data: { assignment_id: assignment.id }.to_json,
        )
      end

      it "deletes it" do
        expect { migrate }.to change { Notification.count }.by(-1)
      end
    end

    context "when some active assignments exist" do
      let(:post) { Fabricate(:post) }
      let(:group) { Fabricate(:group) }
      let!(:assignment) { Fabricate(:topic_assignment, topic: post.topic, assigned_to: group) }
      let!(:inactive_assignment) { Fabricate(:post_assignment, post: post, active: false) }
      let!(:assignment_with_deleted_topic) { Fabricate(:topic_assignment) }

      before do
        group.users << Fabricate(:user)
        assignment_with_deleted_topic.topic.trash!
      end

      context "when notifications are missing" do
        it "creates them" do
          expect { migrate }.to change { Notification.assigned.count }.by(1)
        end
      end
    end
  end
end
