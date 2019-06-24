# frozen_string_literal: true

require 'rails_helper'

RSpec.describe DiscourseAssign::AssignController do

  before { SiteSetting.assign_enabled = true }

  let(:default_allowed_group) { Group.find_by(name: 'staff') }
  let(:user) { Fabricate(:admin, groups: [default_allowed_group]) }
  let(:post) { Fabricate(:post) }
  let(:user2) { Fabricate(:active_user) }

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
        SiteSetting.assign_allowed_on_groups = 'staff|everyone'
        TopicAssigner.new(post.topic, user).assign(user2)

        get '/assign/suggestions.json'
        suggestions = JSON.parse(response.body)['suggested_users'].map { |u| u['username'] }

        expect(suggestions).to contain_exactly(user2.username, user.username)
      end

      it 'does not include users from disallowed groups' do
        allowed_group = Group.find_by(name: 'everyone')
        user2.groups << allowed_group
        SiteSetting.assign_allowed_on_groups = 'staff'
        TopicAssigner.new(post.topic, user).assign(user2)

        get '/assign/suggestions.json'
        suggestions = JSON.parse(response.body)['suggested_users'].map { |u| u['username'] }

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
      suggestions = JSON.parse(response.body)['suggested_users'].map { |u| u['username'] }

      expect(suggestions).to contain_exactly(user.username)
    end

    it 'always includes staff in the list of assign allowed groups' do
      staff_group = Group.select(:name).find_by(id: Group::AUTO_GROUPS[:staff])

      get '/assign/suggestions.json'
      allowed_groups = JSON.parse(response.body).fetch('assign_allowed_groups')

      expect(allowed_groups).to contain_exactly(staff_group.name)
    end


    it 'includes all the groups listed in the site setting' do
      staff_group = Group.select(:name).find_by(id: Group::AUTO_GROUPS[:staff])
      different_group_name = 'another_group'
      SiteSetting.assign_allowed_on_groups = different_group_name

      get '/assign/suggestions.json'
      allowed_groups = JSON.parse(response.body).fetch('assign_allowed_groups')

      expect(allowed_groups).to contain_exactly(staff_group.name, different_group_name)
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
