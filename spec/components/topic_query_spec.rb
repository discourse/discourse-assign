require 'rails_helper'

describe TopicQuery do
  describe '#list_private_messages_assigned' do
    let(:user) { Fabricate(:user) }
    let(:user2) { Fabricate(:user) }

    let(:user_topic) do
      Fabricate(:private_message_topic,
        topic_allowed_users: [
          Fabricate.build(:topic_allowed_user, user: user),
          Fabricate.build(:topic_allowed_user, user: user2)
        ],
        posts: [Fabricate(:post)]
      )
    end

    let(:assigned_topic) do
      topic = Fabricate(:private_message_topic,
        topic_allowed_users: [
          Fabricate.build(:topic_allowed_user, user: user),
          Fabricate.build(:topic_allowed_user, user: user2)
        ],
        posts: [Fabricate(:post)]
      )

      TopicAssigner.new(topic, user).assign(user)
      topic
    end

    let(:group) { Fabricate(:group).add(user) }

    let(:group_assigned_topic) do
      topic = Fabricate(:private_message_topic,
        topic_allowed_users: [],
        topic_allowed_groups: [
          Fabricate.build(:topic_allowed_group, group: group)
        ],
        posts: [Fabricate(:post)]
      )

      TopicAssigner.new(topic, user).assign(user)
      topic
    end

    let(:options) { { status: 'archived' } }

    before do
      SiteSetting.assign_enabled = true
      user_topic
      assigned_topic
      group_assigned_topic
    end

    it 'should return the right topics' do
      expect(TopicQuery.new(user).list_private_messages_assigned(user).topics)
        .to contain_exactly(assigned_topic, group_assigned_topic)

      UserArchivedMessage.archive!(user2.id, assigned_topic.id)

      expect(
        TopicQuery.new(user).list_private_messages_assigned(user).topics
      ).to contain_exactly(assigned_topic, group_assigned_topic)

      expect(
        TopicQuery.new(user, options).list_private_messages_assigned(user).topics
      ).to eq([])

      UserArchivedMessage.archive!(user.id, assigned_topic.id)

      expect(
        TopicQuery.new(user).list_private_messages_assigned(user).topics
      ).to contain_exactly(group_assigned_topic)

      expect(
        TopicQuery.new(user, options).list_private_messages_assigned(user).topics
      ).to contain_exactly(assigned_topic)

      GroupArchivedMessage.archive!(group.id, group_assigned_topic.id)

      expect(
        TopicQuery.new(user).list_private_messages_assigned(user).topics
      ).to eq([])

      expect(
        TopicQuery.new(user, options).list_private_messages_assigned(user).topics
      ).to contain_exactly(assigned_topic, group_assigned_topic)
    end
  end
end
