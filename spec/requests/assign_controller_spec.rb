require 'rails_helper'

RSpec.describe DiscourseAssign::AssignController do

  let(:user) { Fabricate(:admin) }
  let(:post) { Fabricate(:post) }
  let(:user2) { Fabricate(:active_user) }

  before { sign_in(user) }

  context "#suggestions" do
    before { SiteSetting.max_assigned_topics = 1 }

    it 'excludes other users from the suggestions when they already reached the max assigns limit' do
      another_admin = Fabricate(:admin)
      TopicAssigner.new(post.topic, user).assign(another_admin)

      get '/assign/suggestions.json'
      suggestions = JSON.parse(response.body).map { |u| u['username'] }

      expect(suggestions).to contain_exactly(user.username)
    end
  end

  context '#assign' do
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
