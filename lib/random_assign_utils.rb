# frozen_string_literal: true

class RandomAssignUtils
  def self.recently_assigned_users_ids(topic_id, from)
    posts = Post
      .joins(:user)
      .where(topic_id: topic_id, action_code: ['assigned', 'reassigned'])
      .where('posts.created_at > ?', from)
      .order(created_at: :desc)
    usernames = Post.custom_fields_for_ids(posts, [:action_code_who]).map { |_, v| v['action_code_who'] }.uniq
    User.where(username: usernames).limit(100).pluck(:id)
  end

  def self.user_tzinfo(user_id)
    timezone = UserOption.where(user_id: user_id).pluck(:timezone).first || "UTC"

    tzinfo = nil
    begin
      tzinfo = ActiveSupport::TimeZone.find_tzinfo(timezone)
    rescue TZInfo::InvalidTimezoneIdentifier
      Rails.logger.warn("#{User.find_by(id: user_id)&.username} has the timezone #{timezone} set, we do not know how to parse it in Rails (assuming UTC)")
      timezone = "UTC"
      tzinfo = ActiveSupport::TimeZone.find_tzinfo(timezone)
    end

    tzinfo
  end

  def self.no_one!(topic_id, group)
    PostCreator.create!(
      Discourse.system_user,
      topic_id: topic_id,
      raw: I18n.t("discourse_automation.scriptables.random_assign.no_one", group: group),
      validate: false
    )
  end

  def self.in_working_hours?(user_id)
    tzinfo = RandomAssignUtils.user_tzinfo(user_id)
    tztime = tzinfo.now

    !tztime.saturday? &&
    !tztime.sunday? &&
    tztime.hour > 7 &&
    tztime.hour < 11
  end
end
