# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'

describe TopicQuery do
  before do
    SiteSetting.assign_enabled = true
  end

  fab!(:user) { Fabricate(:user) }
  fab!(:user2) { Fabricate(:user) }

  include_context 'A group that is allowed to assign'

  before do
    add_to_assign_allowed_group(user)
    add_to_assign_allowed_group(user2)
  end

  describe '#list_messages_assigned' do
    fab!(:private_message) { Fabricate(:private_message_topic, user: user) }
    fab!(:topic) { Fabricate(:topic, user: user) }
    fab!(:group_topic) { Fabricate(:topic, user: user) }

    before do
      assign_to(private_message, user, user)
      assign_to(topic, user, user)
      assign_to(group_topic, user, assign_allowed_group)
    end

    it 'Includes topics and PMs assigned to user' do
      assigned_messages = TopicQuery.new(user, { page: 0 }).list_messages_assigned(user).topics

      expect(assigned_messages).to contain_exactly(private_message, topic, group_topic)
    end

    it 'Excludes topics and PMs not assigned to user' do
      assigned_messages = TopicQuery.new(user2, { page: 0 }).list_messages_assigned(user2).topics

      expect(assigned_messages).to eq([group_topic])
    end

    it 'direct filter excludes group assignment' do
      assigned_messages = TopicQuery.new(user, { page: 0, filter: :direct }).list_messages_assigned(user).topics

      expect(assigned_messages).to contain_exactly(private_message, topic)
    end

    it 'Returns the results ordered by the bumped_at field' do
      topic.update(bumped_at: 2.weeks.ago)

      assigned_messages = TopicQuery.new(user, { page: 0 }).list_messages_assigned(user).topics

      expect(assigned_messages).to eq([group_topic, private_message, topic])
    end
  end

  describe '#list_group_topics_assigned' do

    fab!(:private_message) { Fabricate(:private_message_topic, user: user) }
    fab!(:topic) { Fabricate(:topic, user: user) }
    fab!(:group_topic) { Fabricate(:topic, user: user) }

    before do
      assign_to(private_message, user, user)
      assign_to(topic, user2, user2)
      assign_to(group_topic, user, assign_allowed_group)
    end

    it 'Includes topics and PMs assigned to user' do
      assigned_messages = TopicQuery.new(user, { page: 0 }).list_group_topics_assigned(assign_allowed_group).topics

      expect(assigned_messages).to contain_exactly(private_message, topic, group_topic)
    end

    it 'Returns the results ordered by the bumped_at field' do
      topic.update(bumped_at: 2.weeks.ago)

      assigned_messages = TopicQuery.new(user, { page: 0 }).list_group_topics_assigned(assign_allowed_group).topics

      expect(assigned_messages).to eq([group_topic, private_message, topic])
    end

    it 'direct filter shows only group assignments' do
      assigned_messages = TopicQuery.new(user, { page: 0, filter: :direct }).list_group_topics_assigned(assign_allowed_group).topics

      expect(assigned_messages).to contain_exactly(group_topic)
    end
  end

  describe '#list_private_messages_assigned' do
    let(:user_topic) do
      topic = Fabricate(:private_message_topic,
        topic_allowed_users: [
          Fabricate.build(:topic_allowed_user, user: user),
          Fabricate.build(:topic_allowed_user, user: user2)
        ],
      )

      topic.posts << Fabricate(:post)
      topic
    end

    let(:assigned_topic) do
      topic = Fabricate(:private_message_topic,
        topic_allowed_users: [
          Fabricate.build(:topic_allowed_user, user: user),
          Fabricate.build(:topic_allowed_user, user: user2)
        ],
      )
      assign_to(topic, user, user)
    end

    let(:group2) { Fabricate(:group) }

    let(:group_assigned_topic) do
      topic = Fabricate(:private_message_topic,
        topic_allowed_users: [],
        topic_allowed_groups: [
          Fabricate.build(:topic_allowed_group, group: assign_allowed_group),
          Fabricate.build(:topic_allowed_group, group: group2)
        ],
      )

      assign_to(topic, user, user)
    end

    before do
      user_topic
      assigned_topic
      group_assigned_topic
    end

    it 'should return the right topics' do
      expect(
        TopicQuery.new(user).list_private_messages_assigned(user).topics
      ).to contain_exactly(assigned_topic, group_assigned_topic)

      UserArchivedMessage.archive!(user.id, assigned_topic)

      expect(
        TopicQuery.new(user).list_private_messages_assigned(user).topics
      ).to contain_exactly(assigned_topic, group_assigned_topic)

      GroupArchivedMessage.archive!(group2.id, group_assigned_topic)

      expect(
        TopicQuery.new(user).list_private_messages_assigned(user).topics
      ).to contain_exactly(assigned_topic, group_assigned_topic)

      GroupArchivedMessage.archive!(assign_allowed_group.id, group_assigned_topic)

      expect(
        TopicQuery.new(user).list_private_messages_assigned(user).topics
      ).to contain_exactly(assigned_topic, group_assigned_topic)
    end
  end

  context "assigned filter" do
    it "filters topics assigned to a user" do
      assigned_topic = Fabricate(:post).topic
      assigned_topic2 = Fabricate(:post).topic

      TopicAssigner.new(assigned_topic, user).assign(user)
      TopicAssigner.new(assigned_topic2, user2).assign(user2)
      query = TopicQuery.new(user, assigned: user.username).list_latest

      expect(query.topics.length).to eq(1)
      expect(query.topics.first).to eq(assigned_topic)
    end

    it "filters topics assigned to the current user" do
      assigned_topic = Fabricate(:post).topic
      assigned_topic2 = Fabricate(:post).topic

      TopicAssigner.new(assigned_topic, user).assign(user)
      TopicAssigner.new(assigned_topic2, user2).assign(user2)
      query = TopicQuery.new(user2, assigned: "me").list_latest

      expect(query.topics.length).to eq(1)
      expect(query.topics.first).to eq(assigned_topic2)
    end

    it "filters topics assigned to nobody" do
      assigned_topic = Fabricate(:post).topic
      unassigned_topic = Fabricate(:topic)

      TopicAssigner.new(assigned_topic, user).assign(user)
      query = TopicQuery.new(user, assigned: "nobody").list_latest

      expect(query.topics.length).to eq(1)
      expect(query.topics.first).to eq(unassigned_topic)
    end

    it "filters topics assigned to anybody (*)" do
      assigned_topic = Fabricate(:post).topic
      Fabricate(:topic)

      TopicAssigner.new(assigned_topic, user).assign(user)
      query = TopicQuery.new(user, assigned: "*").list_latest

      expect(query.topics.length).to eq(1)
      expect(query.topics.first).to eq(assigned_topic)
    end
  end

  def assign_to(topic, user, assignee)
    topic.tap do |t|
      t.posts << Fabricate(:post)
      TopicAssigner.new(t, user).assign(assignee)
    end
  end
end
