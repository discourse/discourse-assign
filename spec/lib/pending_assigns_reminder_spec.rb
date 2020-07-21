# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'

RSpec.describe PendingAssignsReminder do
  before { SiteSetting.assign_enabled = true }

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

    include_context 'A group that is allowed to assign'

    before do
      add_to_assign_allowed_group(user)

      secure_category = Fabricate(:private_category, group: Fabricate(:group))

      @post1 = Fabricate(:post)
      @post2 = Fabricate(:post)
      @post2.topic.update_column(:fancy_title, nil)
      @post3 = Fabricate(:post)
      @post4 = Fabricate(:post)
      TopicAssigner.new(@post1.topic, user).assign(user)
      TopicAssigner.new(@post2.topic, user).assign(user)
      TopicAssigner.new(@post3.topic, user).assign(user)
      TopicAssigner.new(@post4.topic, user).assign(user)
      @post3.topic.trash!
      @post4.topic.update(category: secure_category)
    end

    it 'creates a reminder for a particular user and sets the timestamp of the last reminder' do
      freeze_time
      subject.remind(user)

      post = Post.last

      topic = post.topic
      expect(topic.user).to eq(system)
      expect(topic.archetype).to eq(Archetype.private_message)

      expect(topic.topic_allowed_users.pluck(:user_id)).to contain_exactly(
        system.id, user.id
      )

      expect(topic.title).to eq(I18n.t(
        'pending_assigns_reminder.title',
        pending_assignments: 3
      ))

      expect(post.raw).to include(@post1.topic.fancy_title)
      expect(post.raw).to include(@post2.topic.fancy_title)
      expect(post.raw).to_not include(@post3.topic.fancy_title)
      expect(post.raw).to_not include(@post4.topic.fancy_title)

      expect(
        user.reload.custom_fields[described_class::REMINDED_AT].to_datetime
      ).to eq_time(DateTime.now)
    end
  end
end
