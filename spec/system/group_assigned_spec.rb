# frozen_string_literal: true

RSpec.describe "Assign | Group assigned", type: :system, js: true do
  fab!(:admin)
  fab!(:group)
  fab!(:topic)
  fab!(:post) { Fabricate(:post, topic: topic) }

  let(:topic_list) { PageObjects::Components::TopicList.new }
  let(:topic_list_header) { PageObjects::Components::TopicListHeader.new }

  before do
    group.add(admin)
    SiteSetting.assign_enabled = true
    SiteSetting.assign_allowed_on_groups = group.id.to_s
    Assigner.new(topic, Discourse.system_user).assign(admin)
    sign_in(admin)
  end

  # TODO (martin) Unskip when core PR is merged to make new bulk select method the default
  xit "allows to bulk select assigned topics" do
    visit "/g/#{group.name}/assigned/everyone"

    topic_list_header.click_bulk_select_button
    topic_list.click_topic_checkbox(topic)
    find(".bulk-select-actions").click

    expect(topic_list_header).to have_bulk_select_modal
  end
end
