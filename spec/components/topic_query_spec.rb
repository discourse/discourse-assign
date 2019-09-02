# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'

describe TopicQuery do
  before do
    SiteSetting.assign_enabled = true
  end

  let(:user) { Fabricate(:user) }
  let(:user2) { Fabricate(:user) }

  include_context 'A group that is allowed to assign'

  before do
    add_to_assign_allowed_group(user)
    add_to_assign_allowed_group(user2)
  end

  describe '#list_messages_assigned' do
    before do
      @private_message = Fabricate(:private_message_topic, user: user)
      @topic = Fabricate(:topic, user: user)

      assign_to(@private_message, user)
      assign_to(@topic, user)
    end

    it 'Includes topics and PMs assigned to user' do
      assigned_messages = TopicQuery.new(user).list_messages_assigned(user).topics

      expect(assigned_messages).to contain_exactly(@private_message, @topic)
    end

    it 'Excludes topics and PMs not assigned to user' do
      assigned_messages = TopicQuery.new(user2).list_messages_assigned(user2).topics

      expect(assigned_messages).to be_empty
    end

    it 'Returns the results ordered by the bumped_at field' do
      @topic.update(bumped_at: 2.weeks.ago)

      assigned_messages = TopicQuery.new(user).list_messages_assigned(user).topics

      expect(assigned_messages).to eq([@private_message, @topic])
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
      assign_to(topic, user)
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

      assign_to(topic, user)
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

  def assign_to(topic, user)
    topic.tap do |t|
      t.posts << Fabricate(:post)
      TopicAssigner.new(t, user).assign(user)
    end
  end
end
