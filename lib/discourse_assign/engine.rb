# frozen_string_literal: true

module ::DiscourseAssign
  class Engine < ::Rails::Engine
    engine_name PLUGIN_NAME
    isolate_namespace DiscourseAssign
  end
end
