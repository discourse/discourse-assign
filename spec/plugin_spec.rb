# frozen_string_literal: true

require "rails_helper"

RSpec.describe DiscourseAssign do
  before { SiteSetting.assign_enabled = true }

  describe "Events" do
    describe "on 'user_removed_from_group'" do
      let(:group) { Fabricate(:group) }
      let(:user) { Fabricate(:user) }
      let(:first_assignment) { Fabricate(:topic_assignment, assigned_to: group) }
      let(:second_assignment) { Fabricate(:post_assignment, assigned_to: group) }

      before do
        group.users << user
        Fabricate(
          :notification,
          notification_type: Notification.types[:assigned],
          user: user,
          data: { assignment_id: first_assignment.id }.to_json,
        )
        Fabricate(
          :notification,
          notification_type: Notification.types[:assigned],
          user: user,
          data: { assignment_id: second_assignment.id }.to_json,
        )
      end

      it "removes user's notifications related to group assignments" do
        expect { group.remove(user) }.to change { user.notifications.assigned.count }.by(-2)
      end
    end

    describe "on 'user_added_to_group'" do
      let(:group) { Fabricate(:group) }
      let(:user) { Fabricate(:user) }
      let!(:first_assignment) { Fabricate(:topic_assignment, assigned_to: group) }
      let!(:second_assignment) { Fabricate(:post_assignment, assigned_to: group) }
      let!(:third_assignment) { Fabricate(:topic_assignment, assigned_to: group, active: false) }

      it "creates missing notifications for added user" do
        group.add(user)
        [first_assignment, second_assignment].each do |assignment|
          expect_job_enqueued(job: Jobs::AssignNotification, args: { assignment_id: assignment.id })
        end
        expect(
          job_enqueued?(
            job: Jobs::AssignNotification,
            args: {
              assignment_id: third_assignment.id,
            },
          ),
        ).to eq(false)
      end
    end
  end
end
