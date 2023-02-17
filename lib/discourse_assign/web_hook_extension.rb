# frozen_string_literal: true

module DiscourseAssign
  module WebHookExtension
    def self.prepended(base)
      base.class_eval do
        def self.enqueue_assign_hooks(event, payload)
          if active_web_hooks("assign").exists?
            WebHook.enqueue_hooks(:assign, event, payload: payload)
          end
        end
      end
    end
  end
end
