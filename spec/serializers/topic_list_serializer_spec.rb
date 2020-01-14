# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'

RSpec.describe TopicListSerializer do
  fab!(:user) { Fabricate(:user) }

  let(:private_message_topic) do
    topic = Fabricate(:private_message_topic,
      topic_allowed_users: [
        Fabricate.build(:topic_allowed_user, user: user)
      ]
    )
    topic.posts << Fabricate(:post)
    topic
  end

  let(:assigned_topic) do
    topic = Fabricate(:private_message_topic,
      topic_allowed_users: [
        Fabricate.build(:topic_allowed_user, user: user)
      ]
    )

    topic.posts << Fabricate(:post)

    TopicAssigner.new(topic, user).assign(user)
    topic
  end

  let(:guardian) { Guardian.new(user) }
  let(:serializer) { TopicListSerializer.new(topic_list, scope: guardian) }

  include_context 'A group that is allowed to assign'

  before do
    SiteSetting.assign_enabled = true
    add_to_assign_allowed_group(user)
  end

  describe '#assigned_messages_count' do
    let(:topic_list) do
      TopicQuery.new(user, assigned: user.username).list_private_messages_assigned(user)
    end

    before do
      assigned_topic
    end

    it 'should include right attribute' do
      expect(serializer.as_json[:topic_list][:assigned_messages_count])
        .to eq(1)
    end

    describe 'when not viewing assigned list' do
      let(:topic_list) do
        TopicQuery.new(user).list_private_messages_assigned(user)
      end

      describe 'as an admin user' do
        let(:guardian) { Guardian.new(Fabricate(:admin)) }

        it 'should not include the attribute' do
          expect(serializer.as_json[:topic_list][:assigned_messages_count])
            .to eq(nil)
        end
      end

      describe 'as an anon user' do
        let(:guardian) { Guardian.new }

        it 'should not include the attribute' do
          expect(serializer.as_json[:topic_list][:assigned_messages_count])
            .to eq(nil)
        end
      end
    end

    describe 'viewing another user' do
      describe 'as an anon user' do
        let(:guardian) { Guardian.new }

        it 'should not include the attribute' do
          expect(serializer.as_json[:topic_list][:assigned_messages_count])
            .to eq(nil)
        end
      end

      describe 'as a staff' do
        let(:admin) { Fabricate(:admin, groups: [Group.find_by(name: 'staff')]) }
        let(:guardian) { Guardian.new(admin) }

        it 'should include the right attribute' do
          expect(serializer.as_json[:topic_list][:assigned_messages_count])
            .to eq(1)
        end
      end

      describe 'as a normal user' do
        let(:guardian) { Guardian.new(Fabricate(:user)) }

        it 'should not include the attribute' do
          expect(serializer.as_json[:topic_list][:assigned_messages_count])
            .to eq(nil)
        end
      end
    end
  end
end
