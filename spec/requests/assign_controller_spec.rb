# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DiscourseAssign::AssignController do

  before { SiteSetting.assign_enabled = true }

  let(:default_allowed_group) { Group.find_by(name: 'staff') }
  let(:user) { Fabricate(:admin, groups: [default_allowed_group]) }
  let(:post) { Fabricate(:post) }
  let(:user2) { Fabricate(:active_user) }

  let(:above_min_version) do
    current_version = ActiveRecord::Migrator.current_version
    min_version = 201_907_081_533_31
    current_version >= min_version
  end

  describe 'only allow users from allowed groups' do
    before { sign_in(user2) }

    it 'filters requests where current_user is not member of an allowed group' do
      SiteSetting.assign_allowed_on_groups = ''

      put '/assign/assign.json', params: {
        topic_id: post.topic_id, username: user2.username
      }

      expect(response.status).to eq(403)
    end

    context '#suggestions' do
      before { sign_in(user) }

      it 'includes users in allowed groups' do
        allowed_group = Group.find_by(name: 'everyone')
        user2.groups << allowed_group
        user2.groups << default_allowed_group
        defaults = if above_min_version
          "#{default_allowed_group.id}|#{allowed_group.id}"
        else
          "#{default_allowed_group.name}|#{allowed_group.name}"
        end

        SiteSetting.assign_allowed_on_groups = defaults
        TopicAssigner.new(post.topic, user).assign(user2)

        get '/assign/suggestions.json'
        suggestions = JSON.parse(response.body).map { |u| u['username'] }

        expect(suggestions).to contain_exactly(user2.username, user.username)
      end

      it 'does not include users from disallowed groups' do
        allowed_group = Group.find_by(name: 'everyone')
        user2.groups << allowed_group
        SiteSetting.assign_allowed_on_groups = above_min_version ? default_allowed_group.id.to_s : default_allowed_group.name
        TopicAssigner.new(post.topic, user).assign(user2)

        get '/assign/suggestions.json'
        suggestions = JSON.parse(response.body).map { |u| u['username'] }

        expect(suggestions).to contain_exactly(user.username)
      end
    end
  end

  context "#suggestions" do
    before do
      SiteSetting.max_assigned_topics = 1
      sign_in(user)
    end

    it 'excludes other users from the suggestions when they already reached the max assigns limit' do
      another_admin = Fabricate(:admin, groups: [default_allowed_group])
      TopicAssigner.new(post.topic, user).assign(another_admin)

      get '/assign/suggestions.json'
      suggestions = JSON.parse(response.body).map { |u| u['username'] }

      expect(suggestions).to contain_exactly(user.username)
    end
  end

  context '#assign' do
    before do
      sign_in(user)
    end

    it 'assigns topic to a user' do
      put '/assign/assign.json', params: {
        topic_id: post.topic_id, username: user2.username
      }

      expect(response.status).to eq(200)
      expect(post.topic.reload.custom_fields['assigned_to_id']).to eq(user2.id.to_s)
    end

    it 'fails to assign topic to the user if its already assigned to the same user' do
      put '/assign/assign.json', params: {
        topic_id: post.topic_id, username: user2.username
      }

      expect(response.status).to eq(200)
      expect(post.topic.reload.custom_fields['assigned_to_id']).to eq(user2.id.to_s)

      put '/assign/assign.json', params: {
        topic_id: post.topic_id, username: user2.username
      }

      expect(response.status).to eq(400)
      expect(JSON.parse(response.body)['error']).to eq(I18n.t('discourse_assign.already_assigned', username: user2.username))
    end

    it 'fails to assign topic to the user if they already reached the max assigns limit' do
      another_admin = Fabricate(:admin)
      another_post = Fabricate(:post)
      max_assigns = 1
      SiteSetting.max_assigned_topics = max_assigns
      TopicAssigner.new(post.topic, user).assign(another_admin)

      put '/assign/assign.json', params: {
        topic_id: another_post.topic_id, username: another_admin.username
      }

      expect(response.status).to eq(400)
      expect(JSON.parse(response.body)['error']).to eq(
        I18n.t('discourse_assign.too_many_assigns', username: another_admin.username, max: max_assigns)
      )
    end
  end

end
