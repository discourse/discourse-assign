# frozen_string_literal: true

describe "Assign | Bulk Assign", type: :system do
  let(:topic_page) { PageObjects::Pages::Topic.new }
  let(:assign_modal) { PageObjects::Modals::Assign.new }
  let(:topic_list_header) { PageObjects::Components::TopicListHeader.new }
  let(:topic_list) { PageObjects::Components::TopicList.new }
  fab!(:staff_user) { Fabricate(:user, groups: [Group[:staff]]) }
  fab!(:admin)
  #fab!(:post) { Fabricate(:post, topic: topic) }
  fab!(:topics) { Fabricate.times(10, :post).map(&:topic) }

  before do
    SiteSetting.assign_enabled = true
    SiteSetting.experimental_topic_bulk_actions_enabled_groups = "1"

    # The system tests in this file are flaky and auth token related so turning this on
    SiteSetting.verbose_auth_token_logging = true

    sign_in(admin)
  end

  describe "from topic list" do
    it "can assign and unassign topics" do
      ## Assign
      visit "/latest"
      topic = topics.first

      # Select Topic
      topic_list_header.click_bulk_select_button
      topic_list.click_topic_checkbox(topic)

      # Click Assign Button
      topic_list_header.click_bulk_select_topics_dropdown
      expect(topic_list_header).to have_assign_topics_button
      topic_list_header.click_assign_topics_button
      expect(topic_list_header).to have_bulk_select_modal

      # Assign User
      assignee = staff_user.username
      # For some reason you have to click twice!?
      find(".control-group .user-chooser.email-group-user-chooser .formatted-selection").click
      find(".control-group .user-chooser.email-group-user-chooser .formatted-selection").click
      find(".control-group input").fill_in(with: assignee)
      find("li[data-value='#{assignee}']").click

      # Click Confirm
      topic_list_header.click_bulk_topics_confirm

      # Reload and check that topic is now assigned
      visit "/latest"
      expect(topic_list).to have_assigned_status(topic)

      ## Unassign

      # Select Topic
      topic_list_header.click_bulk_select_button
      topic_list.click_topic_checkbox(topic)

      # Click Unassign Button
      topic_list_header.click_bulk_select_topics_dropdown
      expect(topic_list_header).to have_unassign_topics_button
      topic_list_header.click_unassign_topics_button
      expect(topic_list_header).to have_bulk_select_modal

      # Click Confirm
      topic_list_header.click_bulk_topics_confirm

      # Reload and check that topic is now assigned
      visit "/latest"
      expect(topic_list).to have_unassigned_status(topic)
    end
  end
end
