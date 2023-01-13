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
    end
  end
end
