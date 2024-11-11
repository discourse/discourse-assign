# frozen_string_literal: true

module PageObjects
  module Components
    class TopicList < PageObjects::Components::Base
      def has_assigned_status?(topic)
        try_until_success { page.has_css?("#{topic_list_item_assigned(topic)}") }
      end

      def has_unassigned_status?(topic)
        try_until_success { page.has_no_css?("#{topic_list_item_assigned(topic)}") }
      end

      private

      def topic_list_item_assigned(topic)
        "#{topic_list_item_class(topic)} .discourse-tags a.assigned-to"
      end
    end
  end
end
