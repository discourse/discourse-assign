# frozen_string_literal: true

module DiscourseAssign
  module GroupExtension
    extend ActiveSupport::Concern

    prepended do
      has_many :assignments, as: :assigned_to

      scope :assignable,
            ->(user) do
              where(
                "assignable_level in (:levels) OR
                  (
                    assignable_level = #{Group::ALIAS_LEVELS[:members_mods_and_admins]} AND id in (
                    SELECT group_id FROM group_users WHERE user_id = :user_id)
                  ) OR (
                    assignable_level = #{Group::ALIAS_LEVELS[:owners_mods_and_admins]} AND id in (
                    SELECT group_id FROM group_users WHERE user_id = :user_id AND owner IS TRUE)
                  )",
                levels: alias_levels(user),
                user_id: user&.id,
              )
            end
    end
  end
end
