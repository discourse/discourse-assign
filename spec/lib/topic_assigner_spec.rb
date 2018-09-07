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
    let(:assigner) { TopicAssigner.new(topic, moderator) }

    it "can assign and unassign correctly" do
      assigner.assign(moderator)

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
        assigner.assign(moderator)
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

  end
end
