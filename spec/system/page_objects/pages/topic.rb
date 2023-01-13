# frozen_string_literal: true

module PageObjects
  module Pages
    class Topic < PageObjects::Pages::Base
      def click_assign_topic
        find("#topic-footer-button-assign").click
      end

      def click_unassign_topic
        find("#topic-footer-dropdown-reassign").click
        find("[data-value='unassign']").click
      end

      def click_edit_topic_assignment
        find("#topic-footer-dropdown-reassign").click
        find("[data-value='reassign']").click
      end

      def has_assignment_action?(post_num, action, assignee)
        assignee = assignee.is_a?(Group) ? assignee.name : assignee.username
        find("#post_#{post_num}").has_content?(
          I18n.t("js.action_codes.#{action}", who: "@#{assignee}", when: "just now"),
        )
      end
    end
  end
end
