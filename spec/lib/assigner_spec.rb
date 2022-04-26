# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Assigner do
  before { SiteSetting.assign_enabled = true }

  let(:assign_allowed_group) { Group.find_by(name: 'staff') }
  let(:pm_post) { Fabricate(:private_message_post) }
  let(:pm) { pm_post.topic }

  context "assigning and unassigning" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:secure_category) { Fabricate(:private_category, group: Fabricate(:group)) }
    let(:secure_topic) { Fabricate(:post).topic.tap { |t| t.update(category: secure_category) } }
    let(:moderator) { Fabricate(:moderator, groups: [assign_allowed_group]) }
    let(:moderator_2) { Fabricate(:moderator, groups: [assign_allowed_group]) }
    let(:assigner) { described_class.new(topic, moderator_2) }
    let(:assigner_self) { described_class.new(topic, moderator) }

    it "can assign and unassign correctly" do
      expect_enqueued_with(job: :assign_notification) do
        assigner.assign(moderator)
      end

      expect(TopicQuery.new(
        moderator, assigned: moderator.username
      ).list_latest.topics).to eq([topic])

      expect(TopicUser.find_by(user: moderator).notification_level)
        .to eq(TopicUser.notification_levels[:watching])

      expect_enqueued_with(job: :unassign_notification) do
        assigner.unassign
      end

      expect(TopicQuery.new(
        moderator, assigned: moderator.username
      ).list_latest.topics).to eq([])

      expect(TopicUser.find_by(user: moderator).notification_level)
        .to eq(TopicUser.notification_levels[:tracking])
    end

    it "can assign with priority" do
      assigner.assign(moderator, priority: 2)

      expect(topic.assignment.priority_high?).to eq true
    end

    it 'does not update notification level if already watching' do
      TopicUser.change(moderator.id, topic.id,
        notification_level: TopicUser.notification_levels[:watching]
      )

      expect do
        assigner_self.assign(moderator)
      end.to_not change { TopicUser.last.notifications_reason_id }
    end

    it 'does not update notification level if it is not set by the plugin' do
      assigner.assign(moderator)

      expect(TopicUser.find_by(user: moderator).notification_level)
        .to eq(TopicUser.notification_levels[:watching])

      TopicUser.change(moderator.id, topic.id,
        notification_level: TopicUser.notification_levels[:muted]
      )

      assigner.unassign

      expect(TopicUser.find_by(user: moderator, topic: topic).notification_level)
        .to eq(TopicUser.notification_levels[:muted])
    end

    context "when assigns_by_staff_mention is set to true" do
      let(:system_user) { Discourse.system_user }
      let(:moderator) { Fabricate(:admin, username: "modi", groups: [assign_allowed_group]) }
      let(:post) { Fabricate(:post, raw: "Hey you @system, stay unassigned", user: moderator) }
      let(:topic) { post.topic }

      before do
        SiteSetting.assigns_by_staff_mention = true
        SiteSetting.assign_other_regex = "\\byour (list|todo)\\b"
      end

      it "doesn't assign system user" do
        described_class.auto_assign(post)

        expect(topic.assignment).to eq(nil)
      end

      it "assigns first mentioned staff user after system user" do
        post.update(raw: "Don't assign @system. @modi, can you add this to your list?")
        described_class.auto_assign(post)

        expect(topic.assignment.assigned_to_id).to eq(moderator.id)
      end
    end

    it "doesn't assign the same user more than once" do
      SiteSetting.assign_mailer = AssignMailer.levels[:always]
      another_mod = Fabricate(:moderator, groups: [assign_allowed_group])

      Email::Sender.any_instance.expects(:send).once
      expect(assigned_to?(moderator)).to eq(true)

      Email::Sender.any_instance.expects(:send).never
      expect(assigned_to?(moderator)).to eq(false)

      Email::Sender.any_instance.expects(:send).once
      expect(assigned_to?(another_mod)).to eq(true)
    end

    def assigned_to?(assignee)
      assigner.assign(assignee).fetch(:success)
    end

    it "doesn't assign if the user has too many assigned topics" do
      SiteSetting.max_assigned_topics = 1
      another_post = Fabricate.build(:post)
      assigner.assign(moderator)

      second_assign = described_class.new(another_post.topic, moderator_2).assign(moderator)

      expect(second_assign[:success]).to eq(false)
      expect(second_assign[:reason]).to eq(:too_many_assigns)
    end

    it "doesn't enforce the limit when self-assigning" do
      SiteSetting.max_assigned_topics = 1
      another_post = Fabricate(:post)
      assigner.assign(moderator)

      second_assign = described_class.new(another_post.topic, moderator).assign(moderator)

      expect(second_assign[:success]).to eq(true)
    end

    it "doesn't count self-assigns when enforcing the limit" do
      SiteSetting.max_assigned_topics = 1
      another_post = Fabricate(:post)

      first_assign = assigner.assign(moderator)

      # reached limit so stop
      second_assign = described_class.new(Fabricate(:topic), moderator_2).assign(moderator)

      # self assign has a bypass
      third_assign = described_class.new(another_post.topic, moderator).assign(moderator)

      expect(first_assign[:success]).to eq(true)
      expect(second_assign[:success]).to eq(false)
      expect(third_assign[:success]).to eq(true)
    end

    it "doesn't count inactive assigns when enforcing the limit" do
      SiteSetting.max_assigned_topics = 1
      SiteSetting.unassign_on_close = true
      another_post = Fabricate(:post)

      first_assign = assigner.assign(moderator)
      topic.update_status("closed", true, Discourse.system_user)

      second_assign = described_class.new(another_post.topic, moderator_2).assign(moderator)

      expect(first_assign[:success]).to eq(true)
      expect(second_assign[:success]).to eq(true)
    end

    fab!(:admin) { Fabricate(:admin) }

    it 'fails to assign when the assigned user cannot view the pm' do
      assign = described_class.new(pm, admin).assign(moderator)

      expect(assign[:success]).to eq(false)
      expect(assign[:reason]).to eq(:forbidden_assignee_not_pm_participant)
    end

    it 'fails to assign when not all group members has access to pm' do
      assign = described_class.new(pm, admin).assign(moderator.groups.first)

      expect(assign[:success]).to eq(false)
      expect(assign[:reason]).to eq(:forbidden_group_assignee_not_pm_participant)
    end

    it 'fails to assign when the assigned user cannot view the topic' do
      assign = described_class.new(secure_topic, admin).assign(moderator)

      expect(assign[:success]).to eq(false)
      expect(assign[:reason]).to eq(:forbidden_assignee_cant_see_topic)
    end

    it 'fails to assign when the not all group members can view the topic' do
      assign = described_class.new(secure_topic, admin).assign(moderator.groups.first)

      expect(assign[:success]).to eq(false)
      expect(assign[:reason]).to eq(:forbidden_group_assignee_cant_see_topic)
    end

    it "assigns the PM to the moderator when it's included in the list of allowed users" do
      pm.allowed_users << moderator

      assign = described_class.new(pm, admin).assign(moderator)

      expect(assign[:success]).to eq(true)
    end

    it "assigns the PM to the moderator when it's a member of an allowed group" do
      pm.allowed_groups << assign_allowed_group

      assign = described_class.new(pm, admin).assign(moderator)

      expect(assign[:success]).to eq(true)
    end

    it 'triggers error for incorrect type' do
      expect do
        described_class.new(secure_category, moderator).assign(moderator)
      end.to raise_error(Discourse::InvalidAccess)
    end
  end

  context "assign_self_regex" do
    fab!(:me) { Fabricate(:admin) }
    fab!(:op) { Fabricate(:post) }
    fab!(:reply) { Fabricate(:post, topic: op.topic, user: me, raw: "Will fix. Added to my list ;)") }

    before do
      SiteSetting.assigns_by_staff_mention = true
      SiteSetting.assign_self_regex = "\\bmy list\\b"
    end

    it "automatically assigns to myself" do
      expect(described_class.auto_assign(reply)).to eq(success: true)
      expect(op.topic.assignment.assigned_to_id).to eq(me.id)
      expect(op.topic.assignment.assigned_by_user_id).to eq(me.id)
    end

    it "does not automatically assign to myself" do
      admin = Fabricate(:admin)
      raw = <<~MD
        [quote]
        Will fix. Added to my list ;)
        [/quote]

        `my list`

        ```text
        my list
        ```

            my list

        Excellent :clap: Can't wait!
      MD

      another_reply = Fabricate(:post, topic: op.topic, user: admin, raw: raw)
      expect(described_class.auto_assign(another_reply)).to eq(nil)
    end
  end

  context "assign_other_regex" do
    fab!(:me) { Fabricate(:admin) }
    fab!(:other) { Fabricate(:admin) }
    fab!(:op) { Fabricate(:post) }
    fab!(:reply) { Fabricate(:post, topic: op.topic, user: me, raw: "can you add this to your list, @#{other.username}") }

    before do
      SiteSetting.assigns_by_staff_mention = true
      SiteSetting.assign_other_regex = "\\byour (list|todo)\\b"
    end

    it "automatically assigns to other" do
      expect(described_class.auto_assign(reply)).to eq(success: true)
      expect(op.topic.assignment.assigned_to_id).to eq(other.id)
      expect(op.topic.assignment.assigned_by_user_id).to eq(me.id)
    end
  end

  context "unassign_on_close" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:moderator) { Fabricate(:moderator, groups: [assign_allowed_group]) }

    context 'topic' do
      let(:assigner) { described_class.new(topic, moderator) }

      before do
        SiteSetting.unassign_on_close = true
        assigner.assign(moderator)
      end

      it "unassigns on topic closed" do
        topic.update_status("closed", true, moderator)
        expect(TopicQuery.new(moderator, assigned: moderator.username).list_latest.topics).to be_blank
      end

      it "unassigns on topic autoclosed" do
        topic.update_status("autoclosed", true, moderator)
        expect(TopicQuery.new(moderator, assigned: moderator.username).list_latest.topics).to be_blank
      end

      it "does not unassign on topic open" do
        topic.update_status("closed", false, moderator)
        expect(TopicQuery.new(moderator, assigned: moderator.username).list_latest.topics).to eq([topic])
      end

      it "does not unassign on automatic topic open" do
        topic.update_status("autoclosed", false, moderator)
        expect(TopicQuery.new(moderator, assigned: moderator.username).list_latest.topics).to eq([topic])
      end
    end

    context 'post' do
      let(:post_2) { Fabricate(:post, topic: topic) }
      let(:assigner) { described_class.new(post_2, moderator) }

      before do
        SiteSetting.unassign_on_close = true
        SiteSetting.reassign_on_open = true

        assigner.assign(moderator)
      end

      it 'deactivates post assignments when topic is closed' do
        assigner.assign(moderator)

        expect(post_2.assignment.active).to be true

        topic.update_status("closed", true, moderator)
        expect(post_2.assignment.reload.active).to be false
      end

      it 'deactivates post assignments when post is deleted and activate when recovered' do
        assigner.assign(moderator)

        expect(post_2.assignment.active).to be true

        PostDestroyer.new(moderator, post_2).destroy
        expect(post_2.assignment.reload.active).to be false

        PostDestroyer.new(moderator, post_2).recover
        expect(post_2.assignment.reload.active).to be true
      end

      it 'deletes post small action for deleted post' do
        assigner.assign(moderator)
        small_action_post = PostCustomField.where(name: "action_code_post_id").first.post

        PostDestroyer.new(moderator, post_2).destroy
        expect { small_action_post.reload }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end

  context "reassign_on_open" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:moderator) { Fabricate(:moderator, groups: [assign_allowed_group]) }

    context 'topic' do
      let(:assigner) { described_class.new(topic, moderator) }

      before do
        SiteSetting.unassign_on_close = true
        SiteSetting.reassign_on_open = true
        assigner.assign(moderator)
      end

      it "reassigns on topic open" do
        topic.update_status("closed", true, moderator)
        expect(TopicQuery.new(moderator, assigned: moderator.username).list_latest.topics).to be_blank

        topic.update_status("closed", false, moderator)
        expect(TopicQuery.new(moderator, assigned: moderator.username).list_latest.topics).to eq([topic])
      end
    end

    context 'post' do
      let(:post_2) { Fabricate(:post, topic: topic) }
      let(:assigner) { described_class.new(post_2, moderator) }

      before do
        SiteSetting.unassign_on_close = true
        SiteSetting.reassign_on_open = true

        assigner.assign(moderator)
      end

      it 'reassigns post on topic open' do
        assigner.assign(moderator)

        expect(post_2.assignment.active).to be true

        topic.update_status("closed", true, moderator)
        expect(post_2.assignment.reload.active).to be false

        topic.update_status("closed", false, moderator)
        expect(post_2.assignment.reload.active).to be true
      end
    end
  end

  context "assign_emailer" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:moderator) { Fabricate(:moderator, groups: [assign_allowed_group]) }
    let(:moderator_2) { Fabricate(:moderator, groups: [assign_allowed_group]) }

    it "send an email if set to 'always'" do
      SiteSetting.assign_mailer = AssignMailer.levels[:always]

      expect { described_class.new(topic, moderator).assign(moderator) }
        .to change { ActionMailer::Base.deliveries.size }.by(1)
    end

    it "doesn't send an email if assignee is a group" do
      SiteSetting.assign_mailer = AssignMailer.levels[:always]

      expect { described_class.new(topic, moderator).assign(assign_allowed_group) }
        .to change { ActionMailer::Base.deliveries.size }.by(0)
    end

    it "doesn't send an email if the assigner and assignee are not different" do
      SiteSetting.assign_mailer = AssignMailer.levels[:different_users]

      expect { described_class.new(topic, moderator).assign(moderator_2) }
        .to change { ActionMailer::Base.deliveries.size }.by(1)
    end

    it "doesn't send an email if the assigner and assignee are not different" do
      SiteSetting.assign_mailer = AssignMailer.levels[:different_users]

      expect { described_class.new(topic, moderator).assign(moderator) }
        .to change { ActionMailer::Base.deliveries.size }.by(0)
    end

    it "doesn't send an email" do
      SiteSetting.assign_mailer = AssignMailer.levels[:never]

      expect { described_class.new(topic, moderator).assign(moderator_2) }
        .to change { ActionMailer::Base.deliveries.size }.by(0)
    end
  end
end
