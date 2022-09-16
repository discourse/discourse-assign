# frozen_string_literal: true

require "rails_helper"

describe SearchController do
  fab!(:admin) { Fabricate(:admin) }
  fab!(:group) do
    Fabricate(
      :group,
      assignable_level: Group::ALIAS_LEVELS[:everyone],
      flair_upload: Fabricate(:upload),
    )
  end

  before do
    SiteSetting.assign_enabled = true
    sign_in(admin)
  end

  after { Discourse.redis.flushdb }

  it "include assigned group in search result" do
    SearchIndexer.enable
    SiteSetting.use_pg_headlines_for_excerpt = true

    post = Fabricate(:post, topic: Fabricate(:topic, title: "this is an awesome title"))

    Assigner.new(post.topic, admin).assign(group)

    get "/search/query.json", params: { term: "awesome" }

    expect(response.status).to eq(200)
    assigned_to_group_data = response.parsed_body["topics"][0]["assigned_to_group"]

    expect(assigned_to_group_data["id"]).to eq(group.id)
    expect(assigned_to_group_data["name"]).to eq(group.name)
    expect(assigned_to_group_data["assign_icon"]).to eq("group-plus")
    expect(assigned_to_group_data["assign_path"]).to eq("/g/#{group.name}/assigned/everyone")
  end
end
