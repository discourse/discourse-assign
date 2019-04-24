require 'rails_helper'

RSpec.describe Jobs::EnqueueReminders do
  let(:user) { Fabricate(:user) }

  describe '#execute' do
    it 'does not enqueue reminders when there are no assigned tasks' do
      assert_reminders_enqueued(0)
    end

    it 'enqueues a reminder when the user has more than one task' do
      assign_multiple_tasks_to(user)

      assert_reminders_enqueued(1)
    end

    it 'does not enqueue a reminder when the user only has one task' do
      assign_one_task_to(user)

      assert_reminders_enqueued(0)
    end

    it "does not enqueue a reminder if it's too soon" do
      user.upsert_custom_fields(PendingAssignsReminder::REMINDED_AT => 2.days.ago)
      assign_multiple_tasks_to(user)

      assert_reminders_enqueued(0)
    end

    it 'enqueues a reminder if the user was reminded more than a month ago' do
      user.upsert_custom_fields(PendingAssignsReminder::REMINDED_AT => 31.days.ago)
      assign_multiple_tasks_to(user)

      assert_reminders_enqueued(1)
    end

    it 'does not enqueue reminders if the remind frequency is set to never' do
      SiteSetting.remind_assigns_frequency = 0
      assign_multiple_tasks_to(user)

      assert_reminders_enqueued(0)
    end

    it 'does not enqueue reminders if the topic was just assigned to the user' do
      just_assigned = DateTime.now
      assign_multiple_tasks_to(user, just_assigned)

      assert_reminders_enqueued(0)
    end

    def assert_reminders_enqueued(expected_amount)
      expect { subject.execute({}) }.to change(Jobs::RemindUser.jobs, :size).by(expected_amount)
    end

    def assign_one_task_to(user, assigned_on = 3.months.ago)
      freeze_time(assigned_on) do
        post = Fabricate(:post)
        TopicAssigner.new(post.topic, user).assign(user)
      end
    end

    def assign_multiple_tasks_to(user, assigned_on = 3.months.ago)
      PendingAssignsReminder::REMINDER_THRESHOLD.times { assign_one_task_to(user, assigned_on) }
    end
  end
end
