# frozen_string_literal: true

class PendingAssignsReminder
  REMINDED_AT = 'last_reminded_at'
  REMINDER_THRESHOLD = 2

  def remind(user)
    newest_topics = assigned_topics(user, order: :desc)
    return if newest_topics.size < REMINDER_THRESHOLD
    oldest_topics = assigned_topics(user, order: :asc).where.not(id: newest_topics.map(&:id))
    assigned_topics_count = assigned_count_for(user)

    title = I18n.t('pending_assigns_reminder.title', pending_assignments: assigned_topics_count)

    PostCreator.create!(
      Discourse.system_user,
      title: title,
      raw: reminder_body(user, assigned_topics_count, newest_topics, oldest_topics),
      archetype: Archetype.private_message,
      target_usernames: user.username,
      validate: false
    )

    update_last_reminded(user)
  end

  private

  def assigned_count_for(user)
    TopicCustomField.where(name: TopicAssigner::ASSIGNED_TO_ID, value: user.id).count
  end

  def assigned_topics(user, order:)
    Topic.joins(:_custom_fields).select(:slug, :id, :fancy_title, 'topic_custom_fields.created_at AS assigned_at')
      .where('topic_custom_fields.name = ? AND topic_custom_fields.value = ?', TopicAssigner::ASSIGNED_TO_ID, user.id.to_s)
      .order("topic_custom_fields.created_at #{order}")
      .limit(3)
  end

  def reminder_body(user, assigned_topics_count, first_three_topics, last_three_topics)
    newest_list = build_list_for(:newest, first_three_topics)
    oldest_list = build_list_for(:oldest, last_three_topics)

    I18n.t(
      'pending_assigns_reminder.body',
      pending_assignments: assigned_topics_count,
      assignments_link: "#{Discourse.base_url}/u/#{user.username_lower}/activity/assigned",
      newest_assignments: newest_list,
      oldest_assignments: oldest_list,
      frequency: frequency_in_words
    )
  end

  def build_list_for(key, topics)
    return '' if topics.empty?
    initial_list = { 'topic_0' => '', 'topic_1' => '', 'topic_2' => '' }
    items = topics.each_with_index.reduce(initial_list) do |memo, (t, index)|
      memo["topic_#{index}"] = "- [#{Emoji.gsub_emoji_to_unicode(t.fancy_title)}](#{t.relative_url}) - assigned #{time_in_words_for(t)}"
      memo
    end

    I18n.t("pending_assigns_reminder.#{key}", items.symbolize_keys!)
  end

  def time_in_words_for(topic)
    FreedomPatches::Rails4.distance_of_time_in_words(
      Time.zone.now, topic.assigned_at.to_time, false, scope: 'datetime.distance_in_words_verbose'
    )
  end

  def frequency_in_words
    ::RemindAssignsFrequencySiteSettings.frequency_for(SiteSetting.remind_assigns_frequency)
  end

  def update_last_reminded(user)
    update_last_reminded = { REMINDED_AT => DateTime.now }
    # New API in Discouse that's better under concurrency
    if user.respond_to?(:upsert_custom_fields)
      user.upsert_custom_fields(update_last_reminded)
    else
      user.custom_fields.merge!(update_last_reminded)
      user.save_custom_fields
    end
  end
end
