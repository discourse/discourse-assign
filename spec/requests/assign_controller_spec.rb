# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'

RSpec.describe DiscourseAssign::AssignController do

  before { SiteSetting.assign_enabled = true }

  let(:default_allowed_group) { Group.find_by(name: 'staff') }
  let(:user) { Fabricate(:admin, groups: [default_allowed_group]) }
  let(:post) { Fabricate(:post) }
  let(:user2) { Fabricate(:active_user) }

  let(:above_min_version) do
    min_version = 201_907_171_337_43
      migrated_site_setting = DB.query_single(
        "SELECT schema_migrations.version FROM schema_migrations WHERE schema_migrations.version = '#{min_version}'"
      ).first.present?
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
        allowed_group.add(user2)

        defaults = if above_min_version
          "#{default_allowed_group.id}|#{allowed_group.id}"
        else
          "#{default_allowed_group.name}|#{allowed_group.name}"
        end

        SiteSetting.assign_allowed_on_groups = defaults
        TopicAssigner.new(post.topic, user).assign(user2)

        get '/assign/suggestions.json'
        suggestions = JSON.parse(response.body)['suggestions'].map { |u| u['username'] }

        expect(suggestions).to contain_exactly(user2.username, user.username)
      end

      it 'does not include users from disallowed groups' do
        allowed_group = Group.find_by(name: 'everyone')
        allowed_group.add(user2)
        SiteSetting.assign_allowed_on_groups = above_min_version ? default_allowed_group.id.to_s : default_allowed_group.name
        TopicAssigner.new(post.topic, user).assign(user2)

        get '/assign/suggestions.json'
        suggestions = JSON.parse(response.body)['suggestions'].map { |u| u['username'] }

        expect(suggestions).to contain_exactly(user.username)
      end

      it 'does include only visible assign_allowed_on_groups' do
        visible_group = Fabricate(:group, members_visibility_level: Group.visibility_levels[:members])
        visible_group.add(user)
        invisible_group = Fabricate(:group, members_visibility_level: Group.visibility_levels[:members])

        SiteSetting.assign_allowed_on_groups = above_min_version ? "#{visible_group.id}|#{invisible_group.id}"
                                                                 : "#{visible_group.name}|#{invisible_group.name}"

        get '/assign/suggestions.json'
        assign_allowed_on_groups = JSON.parse(response.body)['assign_allowed_on_groups']

        expect(assign_allowed_on_groups).to contain_exactly(visible_group.name)
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
      suggestions = JSON.parse(response.body)['suggestions'].map { |u| u['username'] }

      expect(suggestions).to contain_exactly(user.username)
    end
  end

  context '#assign' do

    include_context 'A group that is allowed to assign'

    before do
      sign_in(user)
      add_to_assign_allowed_group(user2)
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
      another_user = Fabricate(:user)
      add_to_assign_allowed_group(another_user)
      another_post = Fabricate(:post)
      max_assigns = 1
      SiteSetting.max_assigned_topics = max_assigns
      TopicAssigner.new(post.topic, user).assign(another_user)

      put '/assign/assign.json', params: {
        topic_id: another_post.topic_id, username: another_user.username
      }

      expect(response.status).to eq(400)
      expect(JSON.parse(response.body)['error']).to eq(
        I18n.t('discourse_assign.too_many_assigns', username: another_user.username, max: max_assigns)
      )
    end
  end

  context '#assigned' do
    include_context 'A group that is allowed to assign'

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }
    fab!(:post3) { Fabricate(:post) }

    before do
      add_to_assign_allowed_group(user2)

      TopicAssigner.new(post1.topic, user).assign(user)
      TopicAssigner.new(post2.topic, user2).assign(user2)
      TopicAssigner.new(post3.topic, user).assign(user)

      sign_in(user)
    end

    it 'lists topics ordered by user' do
      get '/assign/assigned.json'
      expect(JSON.parse(response.body)['topics'].map { |t| t['id'] }).to match_array([post2.topic_id, post1.topic_id, post3.topic_id])
    end

    it 'works with offset and limit' do
      get '/assign/assigned.json', params: { limit: 2 }
      expect(JSON.parse(response.body)['topics'].map { |t| t['id'] }).to match_array([post2.topic_id, post1.topic_id])

      get '/assign/assigned.json', params: { offset: 2 }
      expect(JSON.parse(response.body)['topics'].map { |t| t['id'] }).to match_array([post3.topic_id])
    end
  end

end
