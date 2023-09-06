# frozen_string_literal: true

require "rails_helper"

RSpec.describe Assignment do
  before { SiteSetting.assign_enabled = true }

  describe ".active_for_group" do
    subject(:assignments) { described_class.active_for_group(group) }

    let!(:group) { Fabricate(:group) }
    let!(:user1) { Fabricate(:user) }
    let!(:user2) { Fabricate(:user) }
    let!(:group_user1) { Fabricate(:group_user, user: user1, group: group) }
    let!(:group_user2) { Fabricate(:group_user, user: user2, group: group) }
    let!(:wrong_group) { Fabricate(:group) }
    let!(:assignment1) { Fabricate(:topic_assignment, assigned_to: group) }
    let!(:assignment2) { Fabricate(:post_assignment, assigned_to: group) }

    before do
      Fabricate(:post_assignment, assigned_to: group, active: false)
      Fabricate(:post_assignment, assigned_to: user1)
      Fabricate(:topic_assignment, assigned_to: wrong_group)
    end

    it "returns active assignments for the group" do
      expect(assignments).to contain_exactly(assignment1, assignment2)
    end
  end

  describe "#assigned_users" do
    subject(:assigned_users) { assignment.assigned_users }

    let(:assignment) { Fabricate.build(:topic_assignment, assigned_to: assigned_to) }

    context "when assigned to a group" do
      let(:assigned_to) { Fabricate.build(:group) }

      context "when group is empty" do
        it "returns an empty collection" do
          expect(assigned_users).to be_empty
        end
      end

      context "when group is not empty" do
        before { assigned_to.users = Fabricate.build_times(2, :user) }

        it "returns users from that group" do
          expect(assigned_users).to eq(assigned_to.users)
        end
      end
    end

    context "when assigned to a user" do
      let(:assigned_to) { Fabricate.build(:user) }

      it "returns that user" do
        expect(assigned_users).to eq([assigned_to])
      end
    end
  end

  describe "#post" do
    subject(:post) { assignment.post }

    context "when target is a topic" do
      let!(:initial_post) { Fabricate(:post) }
      let(:assignment) { Fabricate.build(:topic_assignment, topic: target) }
      let(:target) { initial_post.topic }

      it "returns the first post of that topic" do
        expect(post).to eq(initial_post)
      end
    end

    context "when target is a post" do
      let(:assignment) { Fabricate.build(:post_assignment) }

      it "returns that post" do
        expect(post).to eq(assignment.target)
      end
    end
  end

  describe "#create_missing_notifications!" do
    subject(:create_missing_notifications) do
      assignment.create_missing_notifications!(mark_as_read: mark_as_read)
    end

    let(:assignment) do
      Fabricate(:topic_assignment, assigned_to: assigned_to, assigned_by_user: assigned_by_user)
    end
    let(:mark_as_read) { false }
    let(:assigned_by_user) { Fabricate(:user) }

    context "when assigned to a user" do
      let(:assigned_to) { Fabricate(:user) }

      context "when notification already exists for that user" do
        before do
          Fabricate(
            :notification,
            notification_type: Notification.types[:assigned],
            user: assigned_to,
            data: { assignment_id: assignment.id }.to_json,
          )
        end

        it "does nothing" do
          DiscourseAssign::CreateNotification.expects(:call).never
          create_missing_notifications
        end
      end

      context "when notification does not exist yet" do
        context "when `mark_as_read` is true" do
          let(:mark_as_read) { true }

          it "creates the missing notification" do
            DiscourseAssign::CreateNotification.expects(:call).with(
              assignment: assignment,
              user: assigned_to,
              mark_as_read: true,
            )
            create_missing_notifications
          end
        end

        context "when `mark_as_read` is false" do
          context "when user is the one that assigned" do
            let(:assigned_by_user) { assigned_to }

            it "creates the missing notification" do
              DiscourseAssign::CreateNotification.expects(:call).with(
                assignment: assignment,
                user: assigned_to,
                mark_as_read: true,
              )
              create_missing_notifications
            end
          end

          context "when user is not the one that assigned" do
            it "creates the missing notification" do
              DiscourseAssign::CreateNotification.expects(:call).with(
                assignment: assignment,
                user: assigned_to,
                mark_as_read: false,
              )
              create_missing_notifications
            end
          end
        end
      end
    end

    context "when assigned to a group" do
      let(:assigned_to) { Fabricate(:group) }
      let(:users) { Fabricate.times(3, :user) }
      let(:assigned_by_user) { users.last }

      before do
        assigned_to.users = users
        Fabricate(
          :notification,
          notification_type: Notification.types[:assigned],
          user: users.first,
          data: { assignment_id: assignment.id }.to_json,
        )
      end

      it "creates missing notifications for group users" do
        DiscourseAssign::CreateNotification
          .expects(:call)
          .with(assignment: assignment, user: users.first, mark_as_read: false)
          .never
        DiscourseAssign::CreateNotification.expects(:call).with(
          assignment: assignment,
          user: users.second,
          mark_as_read: false,
        )
        DiscourseAssign::CreateNotification.expects(:call).with(
          assignment: assignment,
          user: users.last,
          mark_as_read: true,
        )
        create_missing_notifications
      end
    end
  end
end
