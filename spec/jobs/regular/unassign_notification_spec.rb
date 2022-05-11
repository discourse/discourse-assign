# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Jobs::UnassignNotification do
  describe '#execute' do
    fab!(:user1) { Fabricate(:user) }
    fab!(:user2) { Fabricate(:user) }
    fab!(:topic) { Fabricate(:topic) }
    fab!(:post) { Fabricate(:post, topic: topic) }
    fab!(:pm_post) { Fabricate(:private_message_post) }
    fab!(:pm) { pm_post.topic }
    fab!(:assign_allowed_group) { Group.find_by(name: 'staff') }

    before do
      assign_allowed_group.add(user1)
    end

    def assert_publish_topic_state(topic, user)
      message = MessageBus.track_publish('/private-messages/assigned') do
        yield
      end.first

      expect(message.data[:topic_id]).to eq(topic.id)
      expect(message.user_ids).to eq([user.id])
    end

    context 'User' do
      it 'deletes notifications' do
        Jobs::AssignNotification.new.execute({ topic_id: topic.id, post_id: post.id, assigned_to_id: user2.id, assigned_to_type: 'User', assigned_by_id: user1.id, skip_small_action_post: false })

        expect {
          described_class.new.execute({ topic_id: topic.id, post_id: post.id, assigned_to_id: user2.id, assigned_to_type: 'User' })
        }.to change { user2.notifications.count }.by(-1)
      end

      it 'should publish the right message when private message' do
        user = pm.allowed_users.first
        assign_allowed_group.add(user)

        assert_publish_topic_state(pm, user) do
          described_class.new.execute({ topic_id: pm.id, post_id: pm_post.id, assigned_to_id: pm.allowed_users.first.id, assigned_to_type: 'User' })
        end
      end
    end

    context 'Group' do
      fab!(:assign_allowed_group) { Group.find_by(name: 'staff') }
      fab!(:user3) { Fabricate(:user) }
      fab!(:group) { Fabricate(:group) }

      before do
        group.add(user2)
        group.add(user3)
      end

      it 'deletes notifications' do
        Jobs::AssignNotification.new.execute({ topic_id: topic.id, post_id: post.id, assigned_to_id: group.id, assigned_to_type: 'Group', assigned_by_id: user1.id, skip_small_action_post: false })

        expect {
          described_class.new.execute({ topic_id: topic.id, post_id: post.id, assigned_to_id: group.id, assigned_to_type: 'Group' })
        }.to change { Notification.count }.by(-2)
      end
    end
  end
end
