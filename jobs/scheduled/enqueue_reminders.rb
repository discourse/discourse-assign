# frozen_string_literal: true

module Jobs
  class EnqueueReminders < Jobs::Scheduled
    every 1.day

    def execute(_args)
      return if skip_enqueue?
      user_ids.each { |id| Jobs.enqueue(:remind_user, user_id: id) }
    end

    private

    def skip_enqueue?
      SiteSetting.remind_assigns_frequency.nil? || !SiteSetting.assign_enabled?
    end

    def user_ids
      global_frequency = SiteSetting.remind_assigns_frequency
      frequency = ActiveRecord::Base.sanitize_sql("COALESCE(user_frequency.value, '#{global_frequency}')::INT")

      DB.query_single(<<~SQL
        SELECT topic_custom_fields.value
        FROM topic_custom_fields

        LEFT OUTER JOIN user_custom_fields AS last_reminder
        ON topic_custom_fields.value::INT = last_reminder.user_id
        AND last_reminder.name = '#{PendingAssignsReminder::REMINDED_AT}'

        LEFT OUTER JOIN user_custom_fields AS user_frequency
        ON topic_custom_fields.value::INT = user_frequency.user_id
        AND user_frequency.name = '#{PendingAssignsReminder::REMINDERS_FREQUENCY}'

        INNER JOIN users ON topic_custom_fields.value::INT = users.id
        INNER JOIN topics ON topics.id = topic_custom_fields.topic_id AND (topics.deleted_at IS NULL)

        WHERE (users.moderator OR users.admin)
        AND #{frequency} > 0
        AND (
          last_reminder.value IS NULL OR
          last_reminder.value::TIMESTAMP <= CURRENT_TIMESTAMP - ('1 MINUTE'::INTERVAL * #{frequency})
        )
        AND topic_custom_fields.updated_at::TIMESTAMP <= CURRENT_TIMESTAMP - ('1 MINUTE'::INTERVAL * #{frequency})
        AND topic_custom_fields.name = '#{TopicAssigner::ASSIGNED_TO_ID}'

        GROUP BY topic_custom_fields.value
        HAVING COUNT(topic_custom_fields.value) > 1
      SQL
      )
    end
  end
end
