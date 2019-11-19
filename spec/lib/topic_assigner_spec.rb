# frozen_string_literal: true

require 'rails_helper'

RSpec.describe TopicAssigner do
  before { SiteSetting.assign_enabled = true }

  let(:assign_allowed_group) { Group.find_by(name: 'staff') }
  let(:pm_post) { Fabricate(:private_message_post) }
  let(:pm) { pm_post.topic }

  def assert_publish_topic_state(topic, user)
    message = MessageBus.track_publish("/private-messages/assigned") do
      yield
    end.first

    expect(message.data[:topic_id]).to eq(topic.id)
    expect(message.user_ids).to eq([user.id])
  end

  describe 'assigning and unassigning private message' do
    it 'should publish the right message' do
      user = pm.allowed_users.first
      assign_allowed_group.add(user)
      assigner = described_class.new(pm, user)

      assert_publish_topic_state(pm, user) { assigner.assign(user) }
      assert_publish_topic_state(pm, user) { assigner.unassign }
    end
  end

  context "assigning and unassigning" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:moderator) { Fabricate(:moderator, groups: [assign_allowed_group]) }
    let(:moderator2) { Fabricate(:moderator, groups: [assign_allowed_group]) }
    let(:assigner) { TopicAssigner.new(topic, moderator2) }
    let(:assigner_self) { TopicAssigner.new(topic, moderator) }

    it "can assign and unassign correctly" do
      messages = MessageBus.track_publish("/notification-alert/#{moderator.id}") do
        assigner.assign(moderator)
      end

      expect(messages.length).to eq(1)
      expect(messages.first.data[:excerpt]).to eq("assigned you the topic '#{topic.title}'")

      expect(TopicQuery.new(
        moderator, assigned: moderator.username
      ).list_latest.topics).to eq([topic])

      expect(TopicUser.find_by(user: moderator).notification_level)
        .to eq(TopicUser.notification_levels[:watching])

      assigner.unassign

      expect(TopicQuery.new(
        moderator, assigned: moderator.username
      ).list_latest.topics).to eq([])

      expect(TopicUser.find_by(user: moderator).notification_level)
        .to eq(TopicUser.notification_levels[:tracking])
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
        TopicAssigner.auto_assign(post)

        expect(topic.custom_fields["assigned_to_id"])
          .to eq(nil)
      end

      it "assigns first mentioned staff user after system user" do
        post.update(raw: "Don't assign @system. @modi, can you add this to your list?")
        TopicAssigner.auto_assign(post)

        expect(topic.custom_fields["assigned_to_id"].to_i)
          .to eq(moderator.id)
      end
    end

    it "doesn't assign the same user more than once" do
      SiteSetting.assign_mailer = 'always'
      another_mod = Fabricate(:moderator, groups: [assign_allowed_group])

      Email::Sender.any_instance.expects(:send).once
      expect(assigned_to?(moderator)).to eq(true)

      Email::Sender.any_instance.expects(:send).never
      expect(assigned_to?(moderator)).to eq(false)

      Email::Sender.any_instance.expects(:send).once
      expect(assigned_to?(another_mod)).to eq(true)
    end

    def assigned_to?(asignee)
      assigner.assign(asignee).fetch(:success)
    end

    it "doesn't assign if the user has too many assigned topics" do
      SiteSetting.max_assigned_topics = 1
      another_post = Fabricate.build(:post)
      assigner.assign(moderator)

      second_assign = TopicAssigner.new(another_post.topic, moderator2).assign(moderator)

      expect(second_assign[:success]).to eq(false)
      expect(second_assign[:reason]).to eq(:too_many_assigns)
    end

    it "doesn't enforce the limit when self-assigning" do
      SiteSetting.max_assigned_topics = 1
      another_post = Fabricate(:post)
      assigner.assign(moderator)

      second_assign = TopicAssigner.new(another_post.topic, moderator).assign(moderator)

      expect(second_assign[:success]).to eq(true)
    end

    it "doesn't count self-assigns when enforcing the limit" do
      SiteSetting.max_assigned_topics = 1
      another_post = Fabricate(:post)

      first_assign = assigner.assign(moderator)

      # reached limit so stop
      second_assign = TopicAssigner.new(Fabricate(:topic), moderator2).assign(moderator)

      # self assign has a bypass
      third_assign = TopicAssigner.new(another_post.topic, moderator).assign(moderator)

      expect(first_assign[:success]).to eq(true)
      expect(second_assign[:success]).to eq(false)
      expect(third_assign[:success]).to eq(true)
    end

    fab!(:admin) { Fabricate(:admin) }

    it 'fails to assign when the assigned user cannot view the topic' do
      assign = TopicAssigner.new(pm, admin).assign(moderator)

      expect(assign[:success]).to eq(false)
      expect(assign[:reason]).to eq(:forbidden_assign_to)
    end

    it "assigns the PM to the moderator when it's included in the list of allowed users" do
      pm.allowed_users << moderator

      assign = TopicAssigner.new(pm, admin).assign(moderator)

      expect(assign[:success]).to eq(true)
    end

    it "assigns the PM to the moderator when it's a member of an allowed group" do
      pm.allowed_groups << assign_allowed_group

      assign = TopicAssigner.new(pm, admin).assign(moderator)

      expect(assign[:success]).to eq(true)
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
      expect(TopicAssigner.auto_assign(reply)).to eq(success: true)
      expect(op.topic.custom_fields).to eq("assigned_to_id" => me.id.to_s, "assigned_by_id" => me.id.to_s)
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
      expect(TopicAssigner.auto_assign(another_reply)).to eq(nil)
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
      expect(TopicAssigner.auto_assign(reply)).to eq(success: true)
      expect(op.topic.custom_fields).to eq("assigned_to_id" => other.id.to_s, "assigned_by_id" => me.id.to_s)
    end
  end

  context "unassign_on_close" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:moderator) { Fabricate(:moderator, groups: [assign_allowed_group]) }
    let(:assigner) { TopicAssigner.new(topic, moderator) }

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

  context "assign_emailer" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:moderator) { Fabricate(:moderator, groups: [assign_allowed_group]) }
    let(:moderator2) { Fabricate(:moderator, groups: [assign_allowed_group]) }

    it "send an email if set to 'always'" do
      SiteSetting.assign_mailer = 'always'

      expect { TopicAssigner.new(topic, moderator).assign(moderator) }
        .to change { ActionMailer::Base.deliveries.size }.by(1)
    end

    it "doesn't send an email if the assigner and assignee are not different" do
      SiteSetting.assign_mailer = 'different_users'

      expect { TopicAssigner.new(topic, moderator).assign(moderator2) }
        .to change { ActionMailer::Base.deliveries.size }.by(1)
    end

    it "doesn't send an email if the assigner and assignee are not different" do
      SiteSetting.assign_mailer = 'different_users'

      expect { TopicAssigner.new(topic, moderator).assign(moderator) }
        .to change { ActionMailer::Base.deliveries.size }.by(0)
    end

    it "doesn't send an email" do
      SiteSetting.assign_mailer = 'never'

      expect { TopicAssigner.new(topic, moderator).assign(moderator2) }
        .to change { ActionMailer::Base.deliveries.size }.by(0)
    end
  end
end
