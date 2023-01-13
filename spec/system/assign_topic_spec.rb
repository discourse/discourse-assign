# frozen_string_literal: true

describe "Assign | Assigning topics", type: :system, js: true do
  let(:topic_page) { PageObjects::Pages::Topic.new }
  let(:assign_modal) { PageObjects::Modals::Assign.new }
  fab!(:staff_user) { Fabricate(:user, groups: [Group[:staff]]) }
  fab!(:admin) { Fabricate(:admin) }
  fab!(:topic) { Fabricate(:topic) }
  fab!(:post) { Fabricate(:post, topic: topic) }

  before do
    SiteSetting.assign_enabled = true
    sign_in(admin)
  end

  describe "with open topic" do
    it "can assign and unassign" do
      visit "/t/#{topic.id}"

      topic_page.click_assign_topic
      assign_modal.set_assignee(staff_user)
      assign_modal.confirm

      expect(find("#post_2")).to have_content("Assigned")
      expect(find("#topic .assigned-to")).to have_content(staff_user.username)

      topic_page.click_unassign_topic

      expect(find("#post_3")).to have_content("Unassigned")
      expect(page).not_to have_css("#topic .assigned-to")
    end

    context "when unassign_on_close is set to true" do
      before { SiteSetting.unassign_on_close = true }

      it "topic gets unassigned on close" do
        visit "/t/#{topic.id}"

        topic_page.click_assign_topic
        assign_modal.set_assignee(staff_user)
        assign_modal.confirm

        expect(find("#post_2")).to have_content("Assigned")

        find(".topic-footer-main-buttons .toggle-admin-menu").click
        find(".topic-admin-close").click

        expect(find("#post_3")).to have_content("Closed")
        expect(page).not_to have_css("#post_4")
        expect(page).not_to have_css("#topic .assigned-to")
      end

      it "can assign the previous assignee" do
        visit "/t/#{topic.id}"

        topic_page.click_assign_topic
        assign_modal.set_assignee(staff_user)
        assign_modal.confirm

        expect(find("#post_2")).to have_content("Assigned")

        find(".topic-footer-main-buttons .toggle-admin-menu").click
        find(".topic-admin-close").click

        expect(find("#post_3")).to have_content("Closed")
        expect(page).not_to have_css("#post_4")
        expect(page).not_to have_css("#topic .assigned-to")

        topic_page.click_assign_topic
        assign_modal.set_assignee(staff_user)
        assign_modal.confirm

        expect(page).not_to have_css("#post_4")
        expect(find("#topic .assigned-to")).to have_content(staff_user.username)
      end

      context "when reassign_on_open is set to true" do
        before { SiteSetting.reassign_on_open = true }

        it "topic gets reassigned on open" do
          visit "/t/#{topic.id}"

          topic_page.click_assign_topic
          assign_modal.set_assignee(staff_user)
          assign_modal.confirm

          expect(find("#post_2")).to have_content("Assigned")

          find(".topic-footer-main-buttons .toggle-admin-menu").click
          find(".topic-admin-close").click

          expect(find("#post_3")).to have_content("Closed")
          expect(page).not_to have_css("#post_4")
          expect(page).not_to have_css("#topic .assigned-to")

          find(".topic-footer-main-buttons .toggle-admin-menu").click
          find(".topic-admin-open").click

          expect(page).not_to have_css("#post_4")
          expect(find("#topic .assigned-to")).to have_content(staff_user.username)
        end
      end
    end
  end
end
