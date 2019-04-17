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
        .joins("LEFT JOIN users ON topic_custom_fields.value::INT = users.id")
        .where("COALESCE(users.last_tasks_reminder, '2010-01-01') <= CURRENT_TIMESTAMP - ('1 MINUTE'::INTERVAL * ?)", interval)
        .where(name: TopicAssigner::ASSIGNED_TO_ID)
        .group(:value).having('COUNT(value) > 1')
        .pluck(:value)
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
