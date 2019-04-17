module Jobs
  class RemindUser < Jobs::Scheduled
    sidekiq_options queue: 'low'

    def execute(args)
      raise Discourse::InvalidParameters.new(:user_id) unless args[:user_id].present?

      user = User.find(args[:user_id])

      PendingAssignsReminder.new.remind(user)
    end
  end
end
