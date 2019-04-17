require 'rails_helper'

RSpec.describe Jobs::EnqueueReminders do
  let(:user) { Fabricate(:user) }

  describe '#execute' do
    it 'Do not enqueue reminders when there are no assigned tasks' do
      Jobs.expects(:enqueue).never

      trigger_enqueue
    end

    it 'Enqueues a reminder when the user has more than one task' do
      assign_multiple_tasks_to(user)

      Jobs.expects(:enqueue).with(:remind_user, user_id: user.id.to_s).once

      trigger_enqueue
    end

    it 'Do not enqueue a reminder when the user only has one task' do
      assign_one_task_to(user)

      Jobs.expects(:enqueue).with(:remind_user, user_id: user.id.to_s).never

      trigger_enqueue
    end

    it "Do not enqueue a reminder if it's too soon" do
      SiteSetting.remind_assigns = 'monthly'
      user.update(last_tasks_reminder: 2.days.ago)
      assign_multiple_tasks_to(user)

      Jobs.expects(:enqueue).with(:remind_user, user_id: user.id.to_s).never

      trigger_enqueue
    end

    it 'Enqueues a reminder if the user was reminded more than a month ago' do
      SiteSetting.remind_assigns = 'monthly'
      user.update(last_tasks_reminder: 31.days.ago)
      assign_multiple_tasks_to(user)

      Jobs.expects(:enqueue).with(:remind_user, user_id: user.id.to_s).once

      trigger_enqueue
    end

    it 'Do not enqueue reminders if the remind frequency is set to never' do
      SiteSetting.remind_assigns = 'never'
      assign_multiple_tasks_to(user)

      Jobs.expects(:enqueue).with(:remind_user, user_id: user.id.to_s).never

      trigger_enqueue
    end

    def trigger_enqueue
      subject.execute({})
    end

    def assign_one_task_to(an_user)
      post = Fabricate(:post)
      TopicAssigner.new(post.topic, an_user).assign(an_user)
    end

    def assign_multiple_tasks_to(an_user)
      assign_one_task_to(an_user)
      assign_one_task_to(an_user)
    end
  end
end
