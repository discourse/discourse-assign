# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Jobs::AssignNotification do
  describe '#execute' do
    fab!(:user1) { Fabricate(:user) }
    fab!(:user2) { Fabricate(:user) }
    fab!(:topic) { Fabricate(:topic) }
    fab!(:post) { Fabricate(:post, topic: topic) }
    fab!(:pm_post) { Fabricate(:private_message_post) }
    fab!(:pm) { pm_post.topic }
    fab!(:assign_allowed_group) { Group.find_by(name: 'staff') }

    def assert_publish_topic_state(topic, user)
      message = MessageBus.track_publish('/private-messages/assigned') do
        yield
      end.first

      expect(message.data[:topic_id]).to eq(topic.id)
      expect(message.user_ids).to eq([user.id])
    end

    before do
      assign_allowed_group.add(user1)
    end

    context 'User' do

      it 'sends notification alert' do
        messages = MessageBus.track_publish("/notification-alert/#{user2.id}") do
          described_class.new.execute({ topic_id: topic.id, assigned_to_id: user2.id, assigned_to_type: 'User', assigned_by_id: user1.id, silent: false })
        end

        expect(messages.length).to eq(1)
        expect(messages.first.data[:excerpt]).to eq("assigned you the topic '#{topic.title}'")
      end

      it 'should publish the right message when private message' do
        user = pm.allowed_users.first
        assign_allowed_group.add(user)

        assert_publish_topic_state(pm, user) do
          described_class.new.execute({ topic_id: pm.id, assigned_to_id: pm.allowed_users.first.id, assigned_to_type: 'User', assigned_by_id: user1.id, silent: false })
        end
      end

      it 'sends a high priority notification to the assignee' do
        Notification.expects(:create!).with(
          notification_type: Notification.types[:custom],
          user_id: user2.id,
          topic_id: topic.id,
          post_number: 1,
          high_priority: true,
          data: {
            message: 'discourse_assign.assign_notification',
            display_username: user1.username,
            topic_title: topic.title
          }.to_json
        )
        described_class.new.execute({ topic_id: topic.id, assigned_to_id: user2.id, assigned_to_type: 'User', assigned_by_id: user1.id, silent: false })
      end
    end

    context 'Group' do
      fab!(:user3) { Fabricate(:user) }
      fab!(:group) { Fabricate(:group) }
      let(:assignment) { Assignment.create!(topic: topic, assigned_by_user: user1, assigned_to: group) }

      before do
        group.add(user2)
        group.add(user3)
      end

      it 'sends notification alert to all group members' do
        messages = MessageBus.track_publish("/notification-alert/#{user2.id}") do
          described_class.new.execute({ topic_id: topic.id, assigned_to_id: group.id, assigned_to_type: 'Group', assigned_by_id: user1.id, silent: false })
        end
        expect(messages.length).to eq(1)
        expect(messages.first.data[:excerpt]).to eq("assigned you the topic '#{topic.title}'")

        messages = MessageBus.track_publish("/notification-alert/#{user3.id}") do
          described_class.new.execute({ topic_id: topic.id, assigned_to_id: group.id, assigned_to_type: 'Group', assigned_by_id: user1.id, silent: false })
        end
        expect(messages.length).to eq(1)
        expect(messages.first.data[:excerpt]).to eq("assigned you the topic '#{topic.title}'")
      end

      it 'sends a high priority notification to all group members' do
        Notification.expects(:create!).with(
          notification_type: Notification.types[:custom],
          user_id: user2.id,
          topic_id: topic.id,
          post_number: 1,
          high_priority: true,
          data: {
            message: 'discourse_assign.assign_group_notification',
            display_username: group.name,
            topic_title: topic.title
          }.to_json
        )
        Notification.expects(:create!).with(
          notification_type: Notification.types[:custom],
          user_id: user3.id,
          topic_id: topic.id,
          post_number: 1,
          high_priority: true,
          data: {
            message: 'discourse_assign.assign_group_notification',
            display_username: group.name,
            topic_title: topic.title
          }.to_json
        )
        described_class.new.execute({ topic_id: topic.id, assigned_to_id: group.id, assigned_to_type: 'Group', assigned_by_id: user1.id, silent: false })
      end
    end
  end
end
