# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'

describe ListController do

  before { SiteSetting.assign_enabled = true }

  let(:user) { Fabricate(:active_user) }
  let(:user2) { Fabricate(:user) }
  let(:admin) { Fabricate(:admin) }
  let(:post) { Fabricate(:post) }

  describe 'only allow users from allowed groups' do
    include_context 'A group that is allowed to assign'

    it 'filters requests where current_user is not member of an allowed group' do
      sign_in(user)
      SiteSetting.assign_allowed_on_groups = ''

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json"
      expect(response.status).to eq(403)

      get "/topics/messages-assigned/#{user.username_lower}.json"
      expect(response.status).to eq(403)
    end

    it 'as an anon user' do
      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json"
      expect(response.status).to eq(403)

      get "/topics/messages-assigned/#{user.username_lower}.json"
      expect(response.status).to eq(403)
    end

    it 'as an admin user' do
      sign_in(admin)
      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json"
      expect(response.status).to eq(200)

      get "/topics/messages-assigned/#{user.username_lower}.json"
      expect(response.status).to eq(200)
    end
  end

  context '#group_topics_assigned' do
    include_context 'A group that is allowed to assign'

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }
    fab!(:post3) { Fabricate(:post) }

    before do
      add_to_assign_allowed_group(user)

      freeze_time 1.hour.from_now
      TopicAssigner.new(post1.topic, user).assign(user)

      freeze_time 1.hour.from_now
      TopicAssigner.new(post1.topic, user).assign(user2)

      sign_in(user)
    end

    it 'returns user-assigned-topics-list of users in the assigned_allowed_group' do
      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['assigned_to_user']['id'] }).to match_array([user.id])
    end

    it 'returns empty user-assigned-topics-list for users not in the assigned_allowed_group' do
      ids = []
      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json"
      JSON.parse(response.body)['topic_list']['topics'].each do |t|
        if t['assigned_to_user']['id'] == user2.id
          ids.push(t['assigned_to_user']['id'])
        end
      end
      expect(ids).to be_empty
    end
  end

  context '#messages_assigned' do
    include_context 'A group that is allowed to assign'

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }
    fab!(:post3) { Fabricate(:post) }

    before do
      add_to_assign_allowed_group(user)

      freeze_time 1.hour.from_now
      TopicAssigner.new(post1.topic, user).assign(user)

      freeze_time 1.hour.from_now
      TopicAssigner.new(post1.topic, user).assign(user2)

      sign_in(user)
    end

    it 'returns user-assigned-topics-list of given user' do
      get "/topics/messages-assigned/#{user.username_lower}.json"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['assigned_to_user']['id'] }).to match_array([user.id])
    end

    it 'returns empty user-assigned-topics-list for given user not in the assigned_allowed_group' do
      get "/topics/messages-assigned/#{user2.username_lower}.json"
      expect(JSON.parse(response.body)['topic_list']['topics']).to be_empty
    end
  end
end
