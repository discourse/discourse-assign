# frozen_string_literal: true

module Jobs
  class AssignNotification < ::Jobs::Base
    def execute(args)
      raise Discourse::InvalidParameters.new(:topic_id) if args[:topic_id].nil?
      raise Discourse::InvalidParameters.new(:post_id) if args[:post_id].nil?
      raise Discourse::InvalidParameters.new(:assigned_to_id) if args[:assigned_to_id].nil?
      raise Discourse::InvalidParameters.new(:assigned_to_type) if args[:assigned_to_type].nil?
      raise Discourse::InvalidParameters.new(:assigned_by_id) if args[:assigned_by_id].nil?
      raise Discourse::InvalidParameters.new(:assignment_id) if args[:assignment_id].nil?

      if args[:skip_small_action_post].nil?
        raise Discourse::InvalidParameters.new(:skip_small_action_post)
      end

      topic = Topic.find(args[:topic_id])
      post = Post.find(args[:post_id])
      assigned_by = User.find(args[:assigned_by_id])
      assigned_to =
        (
          if args[:assigned_to_type] == "User"
            User.find(args[:assigned_to_id])
          else
            Group.find(args[:assigned_to_id])
          end
        )
      assigned_to_users = args[:assigned_to_type] == "User" ? [assigned_to] : assigned_to.users

      assigned_to_users.each do |user|
        Assigner.publish_topic_tracking_state(topic, user.id)

        next if assigned_by == user

        assigned_to_user = args[:assigned_to_type] == "User"

        PostAlerter.new(post).create_notification_alert(
          user: user,
          post: post,
          username: assigned_by.username,
          notification_type: Notification.types[:assigned] || Notification.types[:custom],
          excerpt:
            I18n.t(
              (
                if assigned_to_user
                  "discourse_assign.topic_assigned_excerpt"
                else
                  "discourse_assign.topic_group_assigned_excerpt"
                end
              ),
              title: topic.title,
              group: assigned_to.name,
              locale: user.effective_locale,
            ),
        )

        next if args[:skip_small_action_post]
        Notification.create!(
          notification_type: Notification.types[:assigned] || Notification.types[:custom],
          user_id: user.id,
          topic_id: topic.id,
          post_number: post.post_number,
          high_priority: true,
          data: {
            message:
              (
                if assigned_to_user
                  "discourse_assign.assign_notification"
                else
                  "discourse_assign.assign_group_notification"
                end
              ),
            display_username: assigned_to_user ? assigned_by.username : assigned_to.name,
            topic_title: topic.title,
            assignment_id: args[:assignment_id],
          }.to_json,
        )
      end
    end
  end
end
