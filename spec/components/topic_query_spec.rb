require 'rails_helper'

describe TopicQuery do
  before do
    SiteSetting.assign_enabled = true
  end

  let(:user) { Fabricate(:user) }
  let(:user2) { Fabricate(:user) }

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

    let(:group) { Fabricate(:group).add(user) }
    let(:group2) { Fabricate(:group) }

    let(:group_assigned_topic) do
      topic = Fabricate(:private_message_topic,
        topic_allowed_users: [],
        topic_allowed_groups: [
          Fabricate.build(:topic_allowed_group, group: group),
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

      GroupArchivedMessage.archive!(group.id, group_assigned_topic)

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
