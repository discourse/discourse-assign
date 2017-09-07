module DiscourseAssign
  module Helpers
    def self.build_assigned_to_user(assigned_to_user_id, topic)
      if assigned_to_user_id && user = User.find_by(id: assigned_to_user_id)
        assigned_at = TopicCustomField.where(
          topic_id: topic.id,
          name: "assigned_to_id"
        ).pluck(:created_at).first

        {
          username: user.username,
          name: user.name,
          avatar_template: user.avatar_template,
          assigned_at: assigned_at
        }
      end
    end
  end
end
