require 'rails_helper'

RSpec.describe PendingAssignsReminder do
  let(:user) { Fabricate(:user) }

  it 'does not create a reminder if the user has 0 assigned topics' do
    assert_reminder_not_created
  end

  it 'does not create a reminder if the user only has one task' do
    post = Fabricate(:post)
    TopicAssigner.new(post.topic, user).assign(user)

    assert_reminder_not_created
  end

  def assert_reminder_not_created
    expect { subject.remind(user) }.to change { Post.count }.by(0)
  end

  describe 'when the user has multiple tasks' do
    let(:system) { Discourse.system_user }

    before do
      @post = Fabricate(:post)
      @another_post = Fabricate(:post)
      TopicAssigner.new(@post.topic, user).assign(user)
      TopicAssigner.new(@another_post.topic, user).assign(user)
      @assigned_posts = 2
    end

    it 'creates a reminder for a particular user and sets the timestamp of the last reminder' do
      expected_last_reminder = DateTime.now

      freeze_time(expected_last_reminder) do
        subject.remind(user)

        created_post = Post.includes(topic: %i[topic_allowed_users]).last
        reminded_at = user.reload.custom_fields[described_class::REMINDED_AT].to_datetime

        assert_remind_was_created_correctly(created_post)
        expect(reminded_at).to eq_time(expected_last_reminder)
      end
    end

    def assert_remind_was_created_correctly(post)
      topic = post.topic
      expect(topic.user).to eq(system)
      expect(topic.archetype).to eq(Archetype.private_message)
      expect(topic.topic_allowed_users.pluck(:user_id)).to contain_exactly(system.id, user.id)
      expect(topic.title).to eq(I18n.t('pending_assigns_reminder.title', pending_assignments: @assigned_posts))
      expect(post.raw).to include(@post.topic.fancy_title)
      expect(post.raw).to include(@another_post.topic.fancy_title)
    end
  end
end
