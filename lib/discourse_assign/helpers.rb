# frozen_string_literal: true

module DiscourseAssign
  module Helpers
    def self.build_assigned_to_user(user, topic)
      return if !user

      {
        username: user.username,
        name: user.name,
        avatar_template: user.avatar_template,
        assigned_at: Assignment.where(target: topic).pluck_first(:created_at)
      }
    end

    def self.build_assigned_to_group(group, topic)
      return if !group

      {
        name: group.name,
        flair_bg_color: group.flair_bg_color,
        flair_color: group.flair_color,
        flair_icon: group.flair_icon,
        flair_upload_id: group.flair_upload_id,
        assigned_at: Assignment.where(target: topic).pluck_first(:created_at)
      }
    end
  end
end
