# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'
require_relative '../fabricators/assign_hook_fabricator.rb'

describe 'integration tests' do
  before do
    SiteSetting.assign_enabled = true
  end

  it 'preloads data in topic list' do
    admin = Fabricate(:admin)
    post = create_post
    list = TopicList.new("latest", admin, [post.topic])
    TopicList.preload([post.topic], list)
    # should not explode for now
  end

  describe 'for a private message' do
    let(:post) { Fabricate(:private_message_post) }
    let(:pm) { post.topic }
    let(:user) { pm.allowed_users.first }
    let(:user2) { pm.allowed_users.last }
    let(:channel) { "/private-messages/assigned" }
    fab!(:group) { Fabricate(:group, assignable_level: Group::ALIAS_LEVELS[:everyone]) }

    include_context 'A group that is allowed to assign'

    before do
      add_to_assign_allowed_group(user)
      add_to_assign_allowed_group(user2)
      group.add(user)
      group.add(user2)
    end

    def assert_publish_topic_state(topic, user: nil, group: nil)
      messages = MessageBus.track_publish do
        yield
      end

      message = messages.find { |m| m.channel == channel }

      expect(message.data[:topic_id]).to eq(topic.id)
      expect(message.user_ids).to eq([user.id]) if user
      expect(message.group_ids).to eq([group.id]) if group
    end

    it 'publishes the right message on archive and move to inbox' do
      assigner = Assigner.new(pm, user)
      assigner.assign(user)

      assert_publish_topic_state(pm, user: user) do
        UserArchivedMessage.archive!(user.id, pm.reload)
      end

      assert_publish_topic_state(pm, user: user) do
        UserArchivedMessage.move_to_inbox!(user.id, pm.reload)
      end
    end

    it 'publishes the right message on archive and move to inbox for groups' do
      assigner = Assigner.new(pm, user)
      assigner.assign(group)

      assert_publish_topic_state(pm, group: group) do
        GroupArchivedMessage.archive!(group.id, pm.reload)
      end

      assert_publish_topic_state(pm, group: group) do
        GroupArchivedMessage.move_to_inbox!(group.id, pm.reload)
      end
    end

    it "unassign and assign user if unassign_on_group_archive" do
      SiteSetting.unassign_on_group_archive = true
      assigner = Assigner.new(pm, user)
      assigner.assign(user)

      GroupArchivedMessage.archive!(group.id, pm.reload)
      expect(pm.assignment).to eq(nil)
      expect(pm.custom_fields["prev_assigned_to_id"]).to eq(user.id)
      expect(pm.custom_fields["prev_assigned_to_type"]).to eq("User")

      GroupArchivedMessage.move_to_inbox!(group.id, pm.reload)
      expect(pm.assignment.assigned_to).to eq(user)
      expect(pm.custom_fields["prev_assigned_to_id"]).to eq(nil)
      expect(pm.custom_fields["prev_assigned_to_type"]).to eq(nil)
    end

    it "unassign and assign group if unassign_on_group_archive" do
      SiteSetting.unassign_on_group_archive = true
      assigner = Assigner.new(pm, user)
      assigner.assign(group)

      GroupArchivedMessage.archive!(group.id, pm.reload)
      expect(pm.assignment).to eq(nil)
      expect(pm.custom_fields["prev_assigned_to_id"]).to eq(group.id)
      expect(pm.custom_fields["prev_assigned_to_type"]).to eq("Group")

      GroupArchivedMessage.move_to_inbox!(group.id, pm.reload)
      expect(pm.assignment.assigned_to).to eq(group)
    end
  end

  describe "on assign_topic event" do
    let(:post) { Fabricate(:post) }
    let(:topic) { post.topic }
    let(:admin) { Fabricate(:admin) }
    let(:user1) { Fabricate(:user) }
    let(:user2) { Fabricate(:user) }

    include_context 'A group that is allowed to assign'

    before do
      add_to_assign_allowed_group(user1)
      add_to_assign_allowed_group(user2)
    end

    it "assigns topic" do
      DiscourseEvent.trigger(:assign_topic, topic, user1, admin)
      expect(topic.assignment.assigned_to_id).to eq(user1.id)

      DiscourseEvent.trigger(:assign_topic, topic, user2, admin)
      expect(topic.assignment.assigned_to_id).to eq(user1.id)

      DiscourseEvent.trigger(:assign_topic, topic, user2, admin, true)
      expect(topic.assignment.assigned_to_id).to eq(user2.id)
    end

    it "triggers a webhook for assigned and unassigned" do
      Fabricate(:assign_web_hook)
      DiscourseEvent.trigger(:assign_topic, topic, user2, admin, true)
      job_args = Jobs::EmitWebHookEvent.jobs[0]["args"].first
      expect(job_args["event_name"]).to eq("assigned")
      payload = JSON.parse(job_args["payload"])
      expect(payload["topic_id"]).to eq(topic.id)
      expect(payload["assigned_to_id"]).to eq(user2.id)

      DiscourseEvent.trigger(:unassign_topic, topic, admin)
      job_args = Jobs::EmitWebHookEvent.jobs[1]["args"].first
      expect(job_args["event_name"]).to eq("unassigned")
      payload = JSON.parse(job_args["payload"])
      expect(payload["topic_id"]).to eq(topic.id)
      expect(payload["unassigned_to_id"]).to eq(user2.id)
    end
  end

  context 'aleady assigned' do
    fab!(:post) { Fabricate(:post) }
    fab!(:post_2) { Fabricate(:post, topic: post.topic) }
    let(:topic) { post.topic }
    fab!(:user) { Fabricate(:user) }

    include_context 'A group that is allowed to assign'

    it 'does not allow to assign topic if post is already assigned' do
      add_to_assign_allowed_group(user)

      assigner = Assigner.new(post, user)
      response = assigner.assign(user)
      expect(response[:success]).to be true

      assigner = Assigner.new(post_2, user)
      response = assigner.assign(user)
      expect(response[:success]).to be true

      assigner = Assigner.new(topic, user)
      response = assigner.assign(user)
      expect(response[:success]).to be false
      expect(response[:reason]).to eq(:already_assigned)
    end
  end

  context 'move post' do
    fab!(:old_topic) { Fabricate(:topic) }
    fab!(:post) { Fabricate(:post, topic: old_topic) }
    fab!(:user) { Fabricate(:user) }
    fab!(:assignment) { Assignment.create!(target_id: post.id, target_type: "Post", topic_id: old_topic.id, assigned_by_user: user, assigned_to: user) }
    let(:new_topic) { Fabricate(:topic) }

    it 'assignment becomes topic assignment when new topic' do
      post.update!(topic: new_topic)
      DiscourseEvent.trigger(:post_moved, post, old_topic.id)
      assignment.reload
      expect(assignment.topic_id).to eq(new_topic.id)
      expect(assignment.target_type).to eq("Topic")
      expect(assignment.target_id).to eq(new_topic.id)
    end

    it 'assigment is still post assignment when not first post' do
      post.update!(topic: new_topic, post_number: "3")
      DiscourseEvent.trigger(:post_moved, post, old_topic.id)
      assignment.reload
      expect(assignment.topic_id).to eq(new_topic.id)
      expect(assignment.target_type).to eq("Post")
      expect(assignment.target_id).to eq(post.id)
    end
  end
end
