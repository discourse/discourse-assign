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
end
