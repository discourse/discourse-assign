# frozen_string_literal: true

Fabricator(:assign_web_hook, from: :web_hook) do
  transient assigned_hook: WebHookEventType.find_by(name: "assigned"),
            unassigned_hook: WebHookEventType.find_by(name: "unassigned")

  after_build do |web_hook, transients|
    web_hook.web_hook_event_types = [transients[:assigned_hook], transients[:unassigned_hook]]
  end
end
