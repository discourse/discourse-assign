# frozen_string_literal: true

require_relative '../support/assign_allowed_group'

RSpec.describe TopicViewSerializer do
  fab!(:user) { Fabricate(:user) }
  fab!(:topic) { Fabricate(:topic) }
  fab!(:post) { Fabricate(:post, topic: topic) }
  let(:guardian) { Guardian.new(user) }

  include_context 'A group that is allowed to assign'

  before do
    SiteSetting.assign_enabled = true
    add_to_assign_allowed_group(user)
  end

  it "includes assigned user in serializer" do
    Assigner.new(topic, user).assign(user)
    serializer = TopicViewSerializer.new(TopicView.new(topic), scope: guardian)
    expect(serializer.as_json[:topic_view][:assigned_to_user][:username]).to eq(user.username)
    expect(serializer.as_json[:topic_view][:assigned_to_group]).to be nil
  end

  it "includes assigned group in serializer" do
    Assigner.new(topic, user).assign(assign_allowed_group)
    serializer = TopicViewSerializer.new(TopicView.new(topic), scope: guardian)
    expect(serializer.as_json[:topic_view][:assigned_to_group][:name]).to eq(assign_allowed_group.name)
    expect(serializer.as_json[:topic_view][:assigned_to_user]).to be nil
  end

  it "includes priority in serializer" do
    Assigner.new(topic, user).assign(user, priority: 1)
    serializer = TopicViewSerializer.new(TopicView.new(topic), scope: guardian)
    expect(serializer.as_json[:topic_view][:assignment_priority]).to eq(1)
  end
end
