# frozen_string_literal: true

class PendingAssignsReminder
  def remind(user)
    topics = assigned_topics(user)
    return if topics.size < 2

    title = I18n.t('pending_assigns_reminder.title', pending_assignments: topics.size)

    PostCreator.create!(
      Discourse.system_user,
      title: title,
      raw: reminder_body(user, topics),
      archetype: Archetype.private_message,
      target_usernames: user.username
    )
  end

  private

  def assigned_topics(user)
    Topic.joins(:_custom_fields).select(:slug, :id, :fancy_title, 'topic_custom_fields.created_at AS assigned_at')
      .where('topic_custom_fields.name = ? AND topic_custom_fields.value = ?', TopicAssigner::ASSIGNED_TO_ID, user.id.to_s)
      .order('topic_custom_fields.created_at DESC')
      .limit(6)
  end

  def reminder_body(user, topics)
    newest, oldest = topics.each_slice(3).to_a
    newest_list = build_list_for(:newest, newest)
    oldest_list = build_list_for(:oldest, oldest)

    I18n.t(
      'pending_assigns_reminder.body',
      pending_assignments: topics.size,
      assignments_link: "#{Discourse.base_url}/u/#{user.username_lower}/assigned",
      newest_assignments: newest_list,
      oldest_assignments: oldest_list,
      frequency: SiteSetting.remind_assigns
    )
  end

  def build_list_for(key, topics)
    return '' if topics.nil? || topics.size.zero?
    initial_list = { 'topic_0' => '', 'topic_1' => '', 'topic_2' => '' }
    items = topics.each_with_index.reduce(initial_list) do |memo, (t, index)|
      memo["topic_#{index}"] = "- [#{Emoji.gsub_emoji_to_unicode(t.fancy_title)}](#{t.relative_url}) - assigned #{time_in_words_for(t)}"
      memo
    end

    I18n.t("pending_assigns_reminder.#{key}", items.symbolize_keys!)
  end

  def time_in_words_for(topic)
    FreedomPatches::Rails4.distance_of_time_in_words(
      Time.now, topic.assigned_at.to_time, false, scope: 'datetime.distance_in_words_verbose'
    )
  end
end
