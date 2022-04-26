# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'

describe UserBookmarkSerializer do
  fab!(:user) { Fabricate(:user) }
  fab!(:topic) { Fabricate(:topic) }
  fab!(:post) { Fabricate(:post, topic: topic) }
  fab!(:bookmark) { Fabricate(:bookmark, user: user, post: post) }
  let(:guardian) { Guardian.new(user) }

  include_context 'A group that is allowed to assign'

  before do
    SiteSetting.assign_enabled = true
    add_to_assign_allowed_group(user)
  end

  it "includes assigned user in serializer" do
    Assigner.new(topic, user).assign(user)
    serializer = UserBookmarkSerializer.new(bookmark, scope: guardian)
    bookmark = serializer.as_json[:user_bookmark]

    expect(bookmark[:assigned_to_user][:id]).to eq(user.id)
    expect(bookmark[:assigned_to_user][:assign_icon]).to eq("user-plus")
    expect(bookmark[:assigned_to_group]).to be(nil)
  end

  it "includes assigned group in serializer" do
    Assigner.new(topic, user).assign(assign_allowed_group)
    serializer = UserBookmarkSerializer.new(bookmark, scope: guardian)
    bookmark = serializer.as_json[:user_bookmark]

    expect(bookmark[:assigned_to_group][:id]).to eq(assign_allowed_group.id)
    expect(bookmark[:assigned_to_group][:assign_icon]).to eq("group-plus")
    expect(bookmark[:assigned_to_user]).to be(nil)
  end
end
