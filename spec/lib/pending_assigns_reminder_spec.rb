require 'rails_helper'

RSpec.describe PendingAssignsReminder do
  let(:user) { Fabricate(:user) }

  it { assert_reminder_not_created }

  it 'Do not create a reminder if the user only has one task' do
    post = Fabricate(:post)
    TopicAssigner.new(post.topic, user).assign(user)

    assert_reminder_not_created
  end

  def assert_reminder_not_created
    created = false
    DiscourseEvent.on(:post_created) { created = true }

    subject.remind(user)

    expect(created).to eq(false)
  end

  describe 'When the user has multiple tasks' do
    let(:system) { Discourse.system_user }

    before do
      @post = Fabricate(:post)
      @another_post = Fabricate(:post)
      TopicAssigner.new(@post.topic, user).assign(user)
      TopicAssigner.new(@another_post.topic, user).assign(user)
      @assigned_posts = 2
    end

    it 'Creates a reminder for a particular user' do
      subject.remind(user)

      created_post = Post.includes(topic: %i[topic_allowed_users]).last

      assert_remind_was_created_correctly(created_post.topic, created_post)
    end

    def assert_remind_was_created_correctly(topic, post)
      expect(topic.user).to eq(system)
      expect(topic.archetype).to eq(Archetype.private_message)
      expect(topic.topic_allowed_users.map(&:user_id)).to match_array([system.id, user.id])
      expect(topic.title).to eq(I18n.t('pending_assigns_reminder.title', pending_assignments: @assigned_posts))
      expect(post.raw).to include(@post.topic.fancy_title)
      expect(post.raw).to include(@another_post.topic.fancy_title)
    end
  end
end
