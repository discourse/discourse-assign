require 'rails_helper'

RSpec.describe TopicAssigner do
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
      assigner = described_class.new(pm, user)

      assert_publish_topic_state(pm, user) { assigner.assign(user) }
      assert_publish_topic_state(pm, user) { assigner.unassign }
    end
  end

  context "assigning and unassigning" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:moderator) { Fabricate(:moderator) }
    let(:moderator2) { Fabricate(:moderator) }
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

    it "can unassign all a user's topics at once" do
      assigner.assign(moderator)
      TopicAssigner.unassign_all(moderator, moderator)
      expect(TopicQuery.new(moderator, assigned: moderator.username).list_latest.topics).to be_blank
    end

    context "when assigns_by_staff_mention is set to true" do
      let(:system_user) { Discourse.system_user }
      let(:moderator) { Fabricate(:admin, username: "modi") }
      let(:post) { Fabricate(:post, raw: "Hey you @system, stay unassigned", user: moderator) }
      let(:topic) { post.topic }

      before do
        SiteSetting.assigns_by_staff_mention = true
      end

      it "doesn't assign system user" do
        TopicAssigner.auto_assign(post)

        expect(topic.custom_fields["assigned_to_id"])
          .to eq(nil)
      end

      it "assigns first mentioned staff user after system user" do
        post.raw = "Don't assign @system, assign @modi instead"
        TopicAssigner.auto_assign(post)

        expect(topic.custom_fields["assigned_to_id"].to_i)
          .to eq(moderator.id)
      end
    end

    it "doesn't assign the same user more than once" do
      SiteSetting.assign_mailer_enabled = true

      Email::Sender.any_instance.expects(:send).once
      expect(assigned_to?(moderator)).to eq(true)

      Email::Sender.any_instance.expects(:send).never
      expect(assigned_to?(moderator)).to eq(false)

      Email::Sender.any_instance.expects(:send).once
      expect(assigned_to?(Fabricate(:moderator))).to eq(true)
    end

    def assigned_to?(moderator)
      assigner.assign(moderator).fetch(:success)
    end

    it "Don't assign if the user has too many assigned topics" do
      SiteSetting.max_assigned_topics = 1
      another_post = Fabricate.build(:post)
      assigner.assign(moderator)

      second_assign = TopicAssigner.new(another_post.topic, moderator).assign(moderator)

      expect(second_assign[:success]).to eq(false)
      expect(second_assign[:reason]).to eq(:too_many_assigns)
    end
  end

  context "unassign_on_close" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:moderator) { Fabricate(:moderator) }
    let(:assigner) { TopicAssigner.new(topic, moderator) }

    before do
      SiteSetting.assign_enabled = true
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
end
