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
    fab!(:topic) { post3.topic }
    fab!(:topic1) { post1.topic }
    fab!(:topic2) { post2.topic }

    before do
      add_to_assign_allowed_group(user)

      Assigner.new(topic1, user).assign(user)
      Assigner.new(topic2, user).assign(user2)

      sign_in(user)
    end

    it 'returns user-assigned-topics-list of users in the assigned_allowed_group and doesnt include deleted topic' do
      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['assigned_to_user']['id'] }).to match_array([user.id])
    end

    it 'returns user-assigned-topics-list of users in the assigned_allowed_group and doesnt include inactive topics' do
      Assignment.where(assigned_to: user, target: topic1).update_all(active: false)

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to eq([])
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

    it 'doesnt returns deleted topics' do
      sign_in(admin)

      Assigner.new(topic, user).assign(user)

      delete "/t/#{topic.id}.json"

      topic.reload

      id = 0
      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json"

      JSON.parse(response.body)['topic_list']['topics'].each do |t|
        if t['id'] == topic.id
          id = t.id
        end
      end

      expect(id).to eq(0)
    end
  end

  context '#sorting messages_assigned and group_topics_assigned' do
    include_context 'A group that is allowed to assign'

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }
    fab!(:post3) { Fabricate(:post) }
    fab!(:topic1) { post1.topic }
    fab!(:topic2) { post2.topic }
    fab!(:topic3) { post3.topic }

    before do
      add_to_assign_allowed_group(user)
      add_to_assign_allowed_group(user2)

      Assigner.new(post1.topic, user).assign(user)
      Assigner.new(post2.topic, user).assign(user2)
      Assigner.new(post3.topic, user).assign(user)

      sign_in(user)
    end

    it 'group_topics_assigned returns sorted topicsList' do
      topic1.bumped_at = Time.now
      topic2.bumped_at = 1.day.ago
      topic3.bumped_at = 3.day.ago

      topic1.views = 3
      topic2.views = 5
      topic3.views = 1

      topic1.posts_count = 3
      topic2.posts_count = 1
      topic3.posts_count = 5

      topic1.save!
      topic2.save!
      topic3.save!

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json?order=posts"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic2.id, topic1.id, topic3.id])

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json?order=views"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic3.id, topic1.id, topic2.id])

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json?order=activity"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic3.id, topic2.id, topic1.id])

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json?order=posts&ascending=true"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic3.id, topic1.id, topic2.id])

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json?order=views&ascending=true"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic2.id, topic1.id, topic3.id])

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json?order=activity&ascending=true"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([ topic1.id, topic2.id, topic3.id])
    end

    it 'messages_assigned returns sorted topicsList' do
      topic1.bumped_at = Time.now
      topic3.bumped_at = 3.day.ago

      topic1.views = 3
      topic3.views = 1

      topic1.posts_count = 3
      topic3.posts_count = 5

      topic1.reload
      topic3.reload

      get "/topics/messages-assigned/#{user.username}.json?order=posts"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic1.id, topic3.id])

      get "/topics/messages-assigned/#{user.username}.json?order=views"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic3.id, topic1.id])

      get "/topics/messages-assigned/#{user.username}.json?order=activity"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic3.id, topic1.id])

      get "/topics/messages-assigned/#{user.username}.json?order=posts&ascending=true"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic3.id, topic1.id])

      get "/topics/messages-assigned/#{user.username}.json?order=views&ascending=true"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic1.id, topic3.id])

      get "/topics/messages-assigned/#{user.username}.json?order=activity&ascending=true"
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic1.id, topic3.id])
    end
  end

  context 'filtering of topics as per parameter' do
    include_context 'A group that is allowed to assign'

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }
    fab!(:post3) { Fabricate(:post) }
    fab!(:topic1) { post1.topic }
    fab!(:topic2) { post2.topic }
    fab!(:topic3) { post3.topic }

    before do
      SearchIndexer.enable

      add_to_assign_allowed_group(user)
      add_to_assign_allowed_group(user2)

      Assigner.new(post1.topic, user).assign(user)
      Assigner.new(post2.topic, user).assign(user2)
      Assigner.new(post3.topic, user).assign(user)

      sign_in(user)
    end

    after { SearchIndexer.disable }

    it 'returns topics as per filter for #group_topics_assigned' do
      topic1.title = 'QUnit testing is love'
      topic2.title = 'RSpec testing is too fun'
      topic3.title = 'Testing is main part of programming'

      topic1.save!
      topic2.save!
      topic3.save!

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json", params: { search: 'Testing' }
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic1.id, topic2.id, topic3.id])

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json", params: { search: 'RSpec' }
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic2.id])

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json", params: { search: 'love' }
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic1.id])
    end

    it 'returns topics as per filter for #group_topics_assigned' do
      topic1.title = 'QUnit testing is love'
      topic2.title = 'RSpec testing is too fun'
      topic3.title = 'Testing is main part of programming'

      topic1.save!
      topic2.save!
      topic3.save!

      get "/topics/messages-assigned/#{user.username}.json", params: { search: 'Testing' }
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic1.id, topic3.id])

      get "/topics/group-topics-assigned/#{get_assigned_allowed_group_name}.json", params: { search: 'love' }
      expect(JSON.parse(response.body)['topic_list']['topics'].map { |t| t['id'] }).to match_array([topic1.id])
    end
  end

  context '#messages_assigned' do
    include_context 'A group that is allowed to assign'

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }

    before do
      add_to_assign_allowed_group(user)

      Assigner.new(post1.topic, user).assign(user)
      Assigner.new(post2.topic, user).assign(user2)

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
