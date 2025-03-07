# frozen_string_literal: true

describe "Assign | Assigning posts", type: :system do
  let(:topic_page) { PageObjects::Pages::Topic.new }
  let(:assign_modal) { PageObjects::Modals::Assign.new }
  fab!(:staff_user) { Fabricate(:user, groups: [Group[:staff]]) }
  fab!(:admin)
  fab!(:topic)
  fab!(:post1) { Fabricate(:post, topic: topic) }
  fab!(:post2) { Fabricate(:post, topic: topic) }

  before do
    SiteSetting.assign_enabled = true

    sign_in(admin)
  end

  describe "with open topic" do
    before { SiteSetting.prioritize_full_name_in_ux = false }

    it "can assign and unassign" do
      visit "/t/#{topic.id}"

      topic_page.click_assign_post(post2)
      assign_modal.assignee = staff_user
      assign_modal.confirm

      expect(assign_modal).to be_closed

      expect(topic_page).to have_assigned_post(user: staff_user, at_post: 3)

      expect(topic_page.find_post_assign(post1.post_number)).to have_content(staff_user.username)
      expect(topic_page.find_post_assign(post2.post_number)).to have_content(staff_user.username)

      visit "/t/#{topic.id}"

      topic_page.click_unassign_post(post2)

      expect(topic_page).to have_unassigned_from_post(user: staff_user, at_post: 4)
      expect(page).to have_no_css("#topic .assigned-to")
    end

    it "can submit modal form with shortcuts" do
      visit "/t/#{topic.id}"

      topic_page.click_assign_post(post2)
      assign_modal.assignee = staff_user

      find("body").send_keys(:tab)
      find("body").send_keys(:control, :enter)

      expect(assign_modal).to be_closed
      expect(topic_page).to have_assigned_post(user: staff_user, at_post: 3)
      expect(topic_page.find_post_assign(post1.post_number)).to have_content(staff_user.username)
      expect(topic_page.find_post_assign(post2.post_number)).to have_content(staff_user.username)
    end

    context "when prioritize_full_name_in_ux setting is enabled" do
      before { SiteSetting.prioritize_full_name_in_ux = true }

      it "shows the user's name after assign" do
        visit "/t/#{topic.id}"

        topic_page.click_assign_post(post2)
        assign_modal.assignee = staff_user
        assign_modal.confirm
        expect(topic_page.find_post_assign(post1.post_number)).to have_content(staff_user.name)
        expect(topic_page.find_post_assign(post2.post_number)).to have_content(staff_user.name)
      end

      it "show the user's username if there is no name" do
        visit "/t/#{topic.id}"
        staff_user.name = nil
        staff_user.save
        staff_user.reload

        topic_page.click_assign_post(post2)
        assign_modal.assignee = staff_user
        assign_modal.confirm
        expect(topic_page.find_post_assign(post1.post_number)).to have_content(staff_user.username)
        expect(topic_page.find_post_assign(post2.post_number)).to have_content(staff_user.username)
      end
    end

    context "when assigns are not public" do
      before { SiteSetting.assigns_public = false }

      it "assigned small action post has 'private-assign' in class attribute" do
        visit "/t/#{topic.id}"

        topic_page.click_assign_post(post2)
        assign_modal.assignee = staff_user
        assign_modal.confirm

        expect(assign_modal).to be_closed
        expect(topic_page).to have_assigned_post(
          user: staff_user,
          at_post: 3,
          class_attribute: ".private-assign",
        )
      end
    end

    context "when unassign_on_close is set to true" do
      before { SiteSetting.unassign_on_close = true }

      it "unassigns the topic on close" do
        visit "/t/#{topic.id}"

        topic_page.click_assign_post(post2)
        assign_modal.assignee = staff_user
        assign_modal.confirm

        expect(assign_modal).to be_closed
        expect(topic_page).to have_assigned_post(user: staff_user, at_post: 3)

        find(".timeline-controls .toggle-admin-menu").click
        find(".topic-admin-close").click

        expect(find("#post_4")).to have_content(
          I18n.t("js.action_codes.closed.enabled", when: "just now"),
        )
        expect(page).to have_no_css("#post_5")
        expect(page).to have_no_css("#topic .assigned-to")
      end

      it "can assign the previous assignee" do
        visit "/t/#{topic.id}"

        topic_page.click_assign_post(post2)
        assign_modal.assignee = staff_user
        assign_modal.confirm

        expect(assign_modal).to be_closed
        expect(topic_page).to have_assigned_post(user: staff_user, at_post: 3)

        find(".timeline-controls .toggle-admin-menu").click
        find(".topic-admin-close").click

        expect(find("#post_4")).to have_content(
          I18n.t("js.action_codes.closed.enabled", when: "just now"),
        )
        expect(page).to have_no_css("#post_5")
        expect(page).to have_no_css("#topic .assigned-to")

        topic_page.click_assign_post(post2)
        assign_modal.assignee = staff_user
        assign_modal.confirm

        expect(page).to have_no_css("#post_5")
        expect(topic_page.find_post_assign(post1.post_number)).to have_content(staff_user.username)
        expect(topic_page.find_post_assign(post2.post_number)).to have_content(staff_user.username)
      end

      context "when reassign_on_open is set to true" do
        before { SiteSetting.reassign_on_open = true }

        it "reassigns the topic on open" do
          visit "/t/#{topic.id}"

          topic_page.click_assign_post(post2)
          assign_modal.assignee = staff_user
          assign_modal.confirm

          expect(assign_modal).to be_closed
          expect(topic_page).to have_assigned_post(user: staff_user, at_post: 3)

          find(".timeline-controls .toggle-admin-menu").click
          find(".topic-admin-close").click

          expect(find("#post_4")).to have_content(
            I18n.t("js.action_codes.closed.enabled", when: "just now"),
          )
          expect(page).to have_no_css("#post_5")
          expect(page).to have_no_css("#topic .assigned-to")

          find(".timeline-controls .toggle-admin-menu").click
          find(".topic-admin-open").click

          expect(find("#post_5")).to have_content(
            I18n.t("js.action_codes.closed.disabled", when: "just now"),
          )
          expect(page).to have_no_css("#post_6")
          expect(topic_page.find_post_assign(post1.post_number)).to have_content(
            staff_user.username,
          )
          expect(topic_page.find_post_assign(post2.post_number)).to have_content(
            staff_user.username,
          )
        end
      end
    end
  end
end
