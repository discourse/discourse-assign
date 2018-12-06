require 'rails_helper'

describe AssignController do

  let(:user) { Fabricate(:active_user) }
  let(:topic) { Fabricate(:topic) }
  let(:user2) { Fabricate(:active_user) }

  context 'assign' do

    it 'assigns topic to a user' do
      sign_in(user)

      post 'assign.json', params: {
        topic_id: topic.id, username: user.username
      }

      expect(response.status).to eq(200)
    end

    it 'fails to assign topic to same user' do
      sign_in(user)

      post 'assign.json', params: {
        topic_id: topic.id, username: user.username
      }

      expect(response.status).to eq(200)

      post 'assign.json', params: {
        topic_id: topic.id, username: user.username
      }

      expect(response.status).to eq(400)
    end

  end

end