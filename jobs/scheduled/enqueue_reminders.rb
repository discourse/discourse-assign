module Jobs
  class EnqueueReminders < Jobs::Scheduled
    every 2.hours

    def execute(_args)
      return if skip_enqueue?
      user_ids.each { |id| Jobs.enqueue(:remind_user, user_id: id) }
    end

    private

    def skip_enqueue?
      SiteSetting.remind_assigns_frequency.nil? || SiteSetting.remind_assigns_frequency.zero?
    end

    def user_ids
      interval = SiteSetting.remind_assigns_frequency

      TopicCustomField
        .joins(<<~SQL
          LEFT OUTER JOIN user_custom_fields ON topic_custom_fields.value::INT = user_custom_fields.user_id
          AND user_custom_fields.name = '#{PendingAssignsReminder::REMINDED_AT}'
        SQL
        ).joins("INNER JOIN users ON topic_custom_fields.value::INT = users.id")
        .where("users.moderator OR users.admin")
        .where(<<~SQL
          user_custom_fields.value IS NULL OR
          user_custom_fields.value::TIMESTAMP <= CURRENT_TIMESTAMP - ('1 MINUTE'::INTERVAL * #{interval})
        SQL
        ).where("topic_custom_fields.updated_at::TIMESTAMP <= CURRENT_TIMESTAMP - ('1 MINUTE'::INTERVAL * ?)", interval)
        .where(name: TopicAssigner::ASSIGNED_TO_ID)
        .group('topic_custom_fields.value').having('COUNT(topic_custom_fields.value) > 1')
        .pluck('topic_custom_fields.value')
    end
  end
end
