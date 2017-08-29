require 'rails_helper'

describe 'integration tests' do
  it 'preloads data in topic list' do
    admin = Fabricate(:admin)
    post = create_post
    list = TopicList.new("latest", admin, [post.topic])
    TopicList.preload([post.topic], list)
    # should not explode for now
  end
end
