# frozen_string_literal: true

module PageObjects
  module Components
    class TopicListHeader < PageObjects::Components::Base

      def has_assign_topics_button?
        page.has_css?(bulk_select_dropdown_item("topics.bulk.assign"))
      end

      def click_assign_topics_button
        find(bulk_select_dropdown_item("topics.bulk.assign")).click
      end

    end
  end
end
