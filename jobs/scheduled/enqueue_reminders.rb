module Jobs
  class EnqueueReminders < Jobs::Scheduled
    def execute(_args)
      return if skip_enqueue?
      user_ids.each { |id| Jobs.enqueue(:remind_user, user_id: id) }
    end

    private

    def skip_enqueue?
      SiteSetting.remind_assigns.nil? || SiteSetting.remind_assigns == 'never'
    end

    def user_ids
      interval = reminder_interval_in_minutes(SiteSetting.remind_assigns)

      TopicCustomField
        .joins(<<~SQL
          LEFT OUTER JOIN user_custom_fields ON topic_custom_fields.value::INT = user_custom_fields.user_id
          AND user_custom_fields.name = '#{PendingAssignsReminder::REMINDED_AT}'
        SQL
        ).where(<<~SQL
          user_custom_fields.value IS NULL OR
          COALESCE(user_custom_fields.value, '2010-01-01')::TIMESTAMP <= CURRENT_TIMESTAMP - ('1 MINUTE'::INTERVAL * #{interval})
        SQL
        ).where(name: TopicAssigner::ASSIGNED_TO_ID)
        .group('topic_custom_fields.value').having('COUNT(topic_custom_fields.value) > 1')
        .pluck('topic_custom_fields.value')
    end

    def reminder_interval_in_minutes(remind_frequency)
      case remind_frequency
      when 'daily'
        1440
      when 'weekly'
        10080
      when 'monthly'
        43200
      else
        131400 # quarterly
      end
    end
  end
end
