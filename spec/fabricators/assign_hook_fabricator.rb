# frozen_string_literal: true

Fabricator(:assign_web_hook, from: :web_hook) do
  transient assign_hook: WebHookEventType.find_by(name: "assign")

  after_build { |web_hook, transients| web_hook.web_hook_event_types = [transients[:assign_hook]] }
end
