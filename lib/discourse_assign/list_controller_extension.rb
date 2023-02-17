# frozen_string_literal: true

module DiscourseAssign
  module ListControllerExtension
    def self.prepended(base)
      base.class_eval { generate_message_route(:private_messages_assigned) }
    end
  end
end
