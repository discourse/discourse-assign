# frozen_string_literal: true

class RandomAssignUtils
  def self.raise_error(automation, message)
    raise("[discourse-automation id=#{automation.id}] #{message}.")
  end

  def self.log_info(automation, message)
    Rails.logger.info("[discourse-automation id=#{automation.id}] #{message}.")
  end

  def self.automation_script!(context, fields, automation)
    raise_error(automation, "discourse-assign is not enabled") unless SiteSetting.assign_enabled?

    unless topic_id = fields.dig("assigned_topic", "value")
      raise_error(automation, "`assigned_topic` not provided")
    end

    unless topic = Topic.find_by(id: topic_id)
      raise_error(automation, "Topic(#{topic_id}) not found")
    end

    min_hours = fields.dig("minimum_time_between_assignments", "value").presence
    if min_hours &&
         TopicCustomField
             .where(name: "assigned_to_id", topic_id: topic_id)
             .where("created_at < ?", min_hours.to_i.hours.ago)
             .exists?
      log_info(automation, "Topic(#{topic_id}) has already been assigned recently")
      return
    end

    unless group_id = fields.dig("assignees_group", "value")
      raise_error(automation, "`assignees_group` not provided")
    end

    unless group = Group.find_by(id: group_id)
      raise_error(automation, "Group(#{group_id}) not found")
    end

    assignable_user_ids = User.assign_allowed.pluck(:id)
    users_on_holiday =
      Set.new(
        User.where(
          id: UserCustomField.where(name: "on_holiday", value: "t").select(:user_id),
        ).pluck(:id),
      )

    group_users = group.group_users.joins(:user)
    if skip_new_users_for_days = fields.dig("skip_new_users_for_days", "value").presence
      group_users = group_users.where("users.created_at < ?", skip_new_users_for_days.to_i.days.ago)
    end

    group_users_ids =
      group_users
        .pluck("users.id")
        .filter { |user_id| assignable_user_ids.include?(user_id) }
        .reject { |user_id| users_on_holiday.include?(user_id) }

    if group_users_ids.empty?
      RandomAssignUtils.no_one!(topic_id, group.name)
      return
    end

    max_recently_assigned_days =
      (fields.dig("max_recently_assigned_days", "value").presence || 180).to_i.days.ago
    last_assignees_ids =
      RandomAssignUtils.recently_assigned_users_ids(topic_id, max_recently_assigned_days)
    users_ids = group_users_ids - last_assignees_ids
    if users_ids.blank?
      min_recently_assigned_days =
        (fields.dig("min_recently_assigned_days", "value").presence || 14).to_i.days.ago
      recently_assigned_users_ids =
        RandomAssignUtils.recently_assigned_users_ids(topic_id, min_recently_assigned_days)
      users_ids = group_users_ids - recently_assigned_users_ids
    end

    if users_ids.blank?
      RandomAssignUtils.no_one!(topic_id, group.name)
      return
    end

    if fields.dig("in_working_hours", "value")
      assign_to_user_id =
        users_ids.shuffle.find { |user_id| RandomAssignUtils.in_working_hours?(user_id) }
    end

    assign_to_user_id ||= users_ids.sample
    if assign_to_user_id.blank?
      RandomAssignUtils.no_one!(topic_id, group.name)
      return
    end

    assign_to = User.find(assign_to_user_id)
    result = nil
    if raw = fields.dig("post_template", "value").presence
      post =
        PostCreator.new(
          Discourse.system_user,
          raw: raw,
          skip_validations: true,
          topic_id: topic.id,
        ).create!

      result = Assigner.new(post, Discourse.system_user).assign(assign_to)

      PostDestroyer.new(Discourse.system_user, post).destroy if !result[:success]
    else
      result = Assigner.new(topic, Discourse.system_user).assign(assign_to)
    end

    RandomAssignUtils.no_one!(topic_id, group.name) if !result[:success]
  end

  def self.recently_assigned_users_ids(topic_id, from)
    posts =
      Post
        .joins(:user)
        .where(topic_id: topic_id, action_code: %w[assigned reassigned assigned_to_post])
        .where("posts.created_at > ?", from)
        .order(created_at: :desc)
    usernames =
      Post.custom_fields_for_ids(posts, [:action_code_who]).map { |_, v| v["action_code_who"] }.uniq
    User.where(username: usernames).limit(100).pluck(:id)
  end

  def self.user_tzinfo(user_id)
    timezone = UserOption.where(user_id: user_id).pluck(:timezone).first || "UTC"

    tzinfo = nil
    begin
      tzinfo = ActiveSupport::TimeZone.find_tzinfo(timezone)
    rescue TZInfo::InvalidTimezoneIdentifier
      Rails.logger.warn(
        "#{User.find_by(id: user_id)&.username} has the timezone #{timezone} set, we do not know how to parse it in Rails (assuming UTC)",
      )
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
      validate: false,
    )
  end

  def self.in_working_hours?(user_id)
    tzinfo = RandomAssignUtils.user_tzinfo(user_id)
    tztime = tzinfo.now

    !tztime.saturday? && !tztime.sunday? && tztime.hour > 7 && tztime.hour < 11
  end
end
