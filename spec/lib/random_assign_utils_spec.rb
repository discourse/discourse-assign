# frozen_string_literal: true

require "rails_helper"
require_relative "../support/assign_allowed_group"
require "random_assign_utils"

describe RandomAssignUtils do
  before do
    SiteSetting.assign_enabled = true

    @orig_logger = Rails.logger
    Rails.logger = @fake_logger = FakeLogger.new
  end

  after { Rails.logger = @orig_logger }

  FakeAutomation = Struct.new(:id)

  let(:post) { Fabricate(:post) }
  let!(:automation) { FakeAutomation.new(1) }

  describe ".automation_script!" do
    context "when all users of group are on holidays" do
      fab!(:topic_1) { Fabricate(:topic) }
      fab!(:group_1) { Fabricate(:group) }
      fab!(:user_1) { Fabricate(:user) }

      before do
        group_1.add(user_1)
        UserCustomField.create!(name: "on_holiday", value: "t", user_id: user_1.id)
      end

      it "creates post on the topic" do
        described_class.automation_script!(
          {},
          {
            "assignees_group" => {
              "value" => group_1.id,
            },
            "assigned_topic" => {
              "value" => topic_1.id,
            },
          },
          automation,
        )
        expect(topic_1.posts.first.raw).to match(
          I18n.t("discourse_automation.scriptables.random_assign.no_one", group: group_1.name),
        )
      end
    end

    context "when all users of group have been assigned recently" do
      fab!(:topic_1) { Fabricate(:topic) }
      fab!(:group_1) { Fabricate(:group) }
      fab!(:user_1) { Fabricate(:user) }

      before do
        Assigner.new(topic_1, Discourse.system_user).assign(user_1)
        group_1.add(user_1)
      end

      it "creates post on the topic" do
        described_class.automation_script!(
          {},
          {
            "assignees_group" => {
              "value" => group_1.id,
            },
            "assigned_topic" => {
              "value" => topic_1.id,
            },
          },
          automation,
        )
        expect(topic_1.posts.first.raw).to match(
          I18n.t("discourse_automation.scriptables.random_assign.no_one", group: group_1.name),
        )
      end
    end

    context "when no users can be assigned because none are members of assign_allowed_on_groups groups" do
      fab!(:topic_1) { Fabricate(:topic) }
      fab!(:group_1) { Fabricate(:group) }
      fab!(:user_1) { Fabricate(:user) }

      before { group_1.add(user_1) }

      it "creates post on the topic" do
        described_class.automation_script!(
          {},
          {
            "assignees_group" => {
              "value" => group_1.id,
            },
            "assigned_topic" => {
              "value" => topic_1.id,
            },
          },
          automation,
        )
        expect(topic_1.posts.first.raw).to match(
          I18n.t("discourse_automation.scriptables.random_assign.no_one", group: group_1.name),
        )
      end
    end

    context "when user can be assigned" do
      fab!(:group_1) { Fabricate(:group) }
      fab!(:user_1) { Fabricate(:user) }
      fab!(:topic_1) { Fabricate(:topic) }

      before do
        SiteSetting.assign_allowed_on_groups = [group_1.id.to_s].join("|")
        group_1.add(user_1)
      end

      context "when post_template is set" do
        it "creates a post with the template and assign the user" do
          described_class.automation_script!(
            {},
            {
              "post_template" => {
                "value" => "this is a post template",
              },
              "assignees_group" => {
                "value" => group_1.id,
              },
              "assigned_topic" => {
                "value" => topic_1.id,
              },
            },
            automation,
          )
          expect(topic_1.posts.first.raw).to match("this is a post template")
        end
      end

      context "when post_template is not set" do
        fab!(:post_1) { Fabricate(:post, topic: topic_1) }

        it "assigns the user to the topic" do
          described_class.automation_script!(
            {},
            {
              "assignees_group" => {
                "value" => group_1.id,
              },
              "assigned_topic" => {
                "value" => topic_1.id,
              },
            },
            automation,
          )
          expect(topic_1.assignment.assigned_to_id).to eq(user_1.id)
        end
      end
    end

    context "when all users are in working hours" do
      fab!(:topic_1) { Fabricate(:topic) }
      fab!(:group_1) { Fabricate(:group) }
      fab!(:user_1) { Fabricate(:user) }

      before do
        freeze_time("2022-10-01 02:00")
        UserOption.find_by(user_id: user_1.id).update(timezone: "Europe/Paris")
        group_1.add(user_1)
      end

      it "creates post on the topic" do
        described_class.automation_script!(
          {},
          {
            "in_working_hours" => {
              "value" => true,
            },
            "assignees_group" => {
              "value" => group_1.id,
            },
            "assigned_topic" => {
              "value" => topic_1.id,
            },
          },
          automation,
        )
        expect(topic_1.posts.first.raw).to match(
          I18n.t("discourse_automation.scriptables.random_assign.no_one", group: group_1.name),
        )
      end
    end

    context "when assignees_group is not provided" do
      fab!(:topic_1) { Fabricate(:topic) }

      it "raises an error" do
        expect {
          described_class.automation_script!(
            {},
            { "assigned_topic" => { "value" => topic_1.id } },
            automation,
          )
        }.to raise_error(/`assignees_group` not provided/)
      end
    end

    context "when assignees_group not found" do
      fab!(:topic_1) { Fabricate(:topic) }

      it "raises an error" do
        expect {
          described_class.automation_script!(
            {},
            {
              "assigned_topic" => {
                "value" => topic_1.id,
              },
              "assignees_group" => {
                "value" => -1,
              },
            },
            automation,
          )
        }.to raise_error(/Group\(-1\) not found/)
      end
    end

    context "when assigned_topic not provided" do
      it "raises an error" do
        expect { described_class.automation_script!({}, {}, automation) }.to raise_error(
          /`assigned_topic` not provided/,
        )
      end
    end

    context "when assigned_topic is not found" do
      it "raises an error" do
        expect {
          described_class.automation_script!(
            {},
            { "assigned_topic" => { "value" => 1 } },
            automation,
          )
        }.to raise_error(/Topic\(1\) not found/)
      end
    end

    context "when minimum_time_between_assignments is set" do
      context "when the topic has been assigned recently" do
        fab!(:topic_1) { Fabricate(:topic) }

        before do
          freeze_time
          TopicCustomField.create!(
            name: "assigned_to_id",
            topic_id: topic_1.id,
            created_at: 20.hours.ago,
          )
        end

        it "logs a warning" do
          described_class.automation_script!(
            {},
            {
              "assigned_topic" => {
                "value" => topic_1.id,
              },
              "minimum_time_between_assignments" => {
                "value" => 10,
              },
            },
            automation,
          )
          expect(Rails.logger.infos.first).to match(
            /Topic\(#{topic_1.id}\) has already been assigned recently/,
          )
        end
      end
    end

    context "when skip_new_users_for_days is set" do
      fab!(:topic_1) { Fabricate(:topic) }
      fab!(:post_1) { Fabricate(:post, topic: topic_1) }
      fab!(:group_1) { Fabricate(:group) }
      fab!(:user_1) { Fabricate(:user) }

      before do
        SiteSetting.assign_allowed_on_groups = "#{group_1.id}"
        group_1.add(user_1)
      end

      it "creates post on the topic if all users are new" do
        described_class.automation_script!(
          {},
          {
            "assignees_group" => {
              "value" => group_1.id,
            },
            "assigned_topic" => {
              "value" => topic_1.id,
            },
            "skip_new_users_for_days" => {
              "value" => "10",
            },
          },
          automation,
        )
        expect(topic_1.posts.last.raw).to match(
          I18n.t("discourse_automation.scriptables.random_assign.no_one", group: group_1.name),
        )
      end

      it "assign topic if all users are old" do
        described_class.automation_script!(
          {},
          {
            "assignees_group" => {
              "value" => group_1.id,
            },
            "assigned_topic" => {
              "value" => topic_1.id,
            },
            "skip_new_users_for_days" => {
              "value" => "0",
            },
          },
          automation,
        )

        expect(topic_1.assignment).not_to eq(nil)
      end
    end
  end

  describe ".recently_assigned_users_ids" do
    context "when no one has been assigned" do
      it "returns an empty array" do
        assignees_ids = described_class.recently_assigned_users_ids(post.topic_id, 2.months.ago)
        expect(assignees_ids).to eq([])
      end
    end

    context "when users have been assigned" do
      let(:admin) { Fabricate(:admin) }
      let(:assign_allowed_group) { Group.find_by(name: "staff") }
      let(:user_1) { Fabricate(:user, groups: [assign_allowed_group]) }
      let(:user_2) { Fabricate(:user, groups: [assign_allowed_group]) }
      let(:user_3) { Fabricate(:user, groups: [assign_allowed_group]) }
      let(:user_4) { Fabricate(:user, groups: [assign_allowed_group]) }
      let(:post_2) { Fabricate(:post, topic: post.topic) }

      it "returns the recently assigned user ids" do
        freeze_time 1.months.ago do
          Assigner.new(post.topic, admin).assign(user_1)
          Assigner.new(post.topic, admin).assign(user_2)
          Assigner.new(post_2, admin).assign(user_4)
        end

        freeze_time 3.months.ago do
          Assigner.new(post.topic, admin).assign(user_3)
        end

        assignees_ids = described_class.recently_assigned_users_ids(post.topic_id, 2.months.ago)

        expect(assignees_ids).to contain_exactly(user_1.id, user_2.id, user_4.id)
      end
    end
  end
end
