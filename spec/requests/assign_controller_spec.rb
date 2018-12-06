require 'rails_helper'

RSpec.describe DiscourseAssign::AssignController do

  let(:user) { Fabricate(:admin) }
  let(:post) { Fabricate(:post) }
  let(:user2) { Fabricate(:active_user) }

  context 'assign' do

    it 'assigns topic to a user' do
      sign_in(user)

      put '/assign/assign', params: {
        topic_id: post.topic_id, username: user2.username
      }

      expect(response.status).to eq(200)
    end

    it 'fails to assign topic to the user if its already assigned to the same user' do
      sign_in(user)

      put '/assign/assign.json', params: {
        topic_id: post.topic_id, username: user2.username
      }

      expect(response.status).to eq(200)

      put '/assign/assign.json', params: {
        topic_id: post.topic_id, username: user2.username
      }

      expect(response.status).to eq(400)
    end

  end

end
