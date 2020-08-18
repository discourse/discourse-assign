# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'

describe Search do

  before do
    SearchIndexer.enable
    SiteSetting.assign_enabled = true
  end

  fab!(:user) { Fabricate(:active_user) }
  fab!(:user2) { Fabricate(:user) }

  context 'Advanced search' do
    include_context 'A group that is allowed to assign'

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }
    fab!(:post3) { Fabricate(:post) }

    before do

      add_to_assign_allowed_group(user)
      add_to_assign_allowed_group(user2)

      TopicAssigner.new(post1.topic, user).assign(user)
      TopicAssigner.new(post2.topic, user).assign(user2)
    end

    it 'can find by status' do
      expect(Search.execute('in:assigned', guardian: Guardian.new(user)).posts.length).to eq(2)
      expect(Search.execute('in:not_assigned', guardian: Guardian.new(user)).posts.length).to eq(1)
      expect(Search.execute("assigned:#{user1.username}", guardian: Guardian.new(user)).posts.length).to eq(1)
    end

  end
end
