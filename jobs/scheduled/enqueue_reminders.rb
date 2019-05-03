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
      global_frequency = SiteSetting.remind_assigns_frequency.to_i
      frequency = "COALESCE(user_frequency.value, '#{global_frequency}')::INT"

      TopicCustomField
        .joins(<<~SQL
          LEFT OUTER JOIN user_custom_fields AS last_reminder ON topic_custom_fields.value::INT = last_reminder.user_id
          AND last_reminder.name = '#{PendingAssignsReminder::REMINDED_AT}'
        SQL
        )
        .joins(<<~SQL
          LEFT OUTER JOIN user_custom_fields AS user_frequency
          ON topic_custom_fields.value::INT = user_frequency.user_id
          AND user_frequency.name = '#{PendingAssignsReminder::REMINDERS_FREQUENCY}'
        SQL
        )
        .joins("INNER JOIN users ON topic_custom_fields.value::INT = users.id")
        .where("users.moderator OR users.admin")
        .where(<<~SQL
          #{frequency} > 0 AND
          (
            last_reminder.value IS NULL OR
            last_reminder.value::TIMESTAMP <= CURRENT_TIMESTAMP - ('1 MINUTE'::INTERVAL * #{frequency})
          )
        SQL
        ).where("topic_custom_fields.updated_at::TIMESTAMP <= CURRENT_TIMESTAMP - ('1 MINUTE'::INTERVAL * #{frequency})")
        .where(name: TopicAssigner::ASSIGNED_TO_ID)
        .joins(:topic)
        .group('topic_custom_fields.value')
        .having('COUNT(topic_custom_fields.value) > 1')
        .pluck('topic_custom_fields.value')
    end
  end
end
