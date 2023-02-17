# frozen_string_literal: true

module DiscourseAssign
  module PostExtension
    def self.prepended(base)
      base.class_eval { has_one :assignment, as: :target, dependent: :destroy }
    end
  end
end
