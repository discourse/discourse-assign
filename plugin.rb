# name: discourse-assign
# about: Assign users to topics
# version: 0.1
# authors: Sam Saffron

register_asset 'stylesheets/assigns.scss'

after_initialize do

  module ::DiscourseAssign
    class Engine < ::Rails::Engine
      engine_name "discourse_assign"
      isolate_namespace DiscourseAssign
    end
  end

  class ::TopicAssigner

    def self.backfill_auto_assign
      staff_mention = User.where('moderator OR admin')
                          .pluck('username')
                          .map{|name| "p.cooked ILIKE '%mention%@#{name}%'"}
                          .join(' OR ')

      sql = <<SQL
      SELECT p.topic_id, MAX(post_number) post_number
      FROM posts p
      JOIN topics t ON t.id = p.topic_id
      LEFT JOIN topic_custom_fields tc ON tc.name = 'assigned_to_id' AND tc.topic_id = p.topic_id
      WHERE p.user_id IN (SELECT id FROM users WHERE moderator OR admin) AND
        ( #{staff_mention} ) AND tc.value IS NULL AND NOT t.closed AND t.deleted_at IS NULL
      GROUP BY p.topic_id
SQL

      assigned = 0
      puts

      ActiveRecord::Base.connection.raw_connection.exec(sql).to_a.each do |row|
        post = Post.find_by(post_number: row["post_number"].to_i,
                            topic_id: row["topic_id"].to_i)
        assigned += 1 if post && auto_assign(post)
        putc "."
      end

      puts
      puts "#{assigned} topics where automatically assigned to staff members"
    end

    def self.assign_self_passes?(post)
      return false unless SiteSetting.assign_self_regex.present?
      regex = Regexp.new(SiteSetting.assign_self_regex) rescue nil

      !!(regex && regex.match(post.raw))
    end

    def self.assign_other_passes?(post)
      return true unless SiteSetting.assign_other_regex.present?
      regex = Regexp.new(SiteSetting.assign_other_regex) rescue nil

      !!(regex && regex.match(post.raw))
    end

    def self.auto_assign(post, force: false)

      if SiteSetting.unassign_on_close && post.topic && post.topic.closed
        assigner = new(post.topic, Discourse.system_user)
        assigner.unassign(silent: true)
      end

      return unless SiteSetting.assigns_by_staff_mention

      if post.user && post.topic && post.user.staff?
        can_assign = force || post.topic.custom_fields["assigned_to_id"].nil?

        assign_other = assign_other_passes?(post) && mentioned_staff(post)
        assign_self = assign_self_passes?(post) && post.user

        if can_assign && is_last_staff_post?(post)
          assigner = new(post.topic, post.user)
          if assign_other
            assigner.assign(assign_other, silent: true)
          elsif assign_self
            assigner.assign(assign_self, silent: true)
          end
        end
      end
    end

    def self.is_last_staff_post?(post)
      Post.exec_sql("SELECT 1 FROM posts p
                     JOIN users u ON u.id = p.user_id AND (moderator OR admin)
                     WHERE p.deleted_at IS NULL AND p.topic_id = :topic_id
                     having max(post_number) = :post_number
                    ",
                     topic_id: post.topic_id,
                     post_number: post.post_number
                   ).to_a.length == 1
    end

    def self.mentioned_staff(post)
      mentions = post.raw_mentions
      if mentions.present?
        User.where('moderator OR admin')
            .where('username_lower IN (?)', mentions.map(&:downcase))
            .first
      end
    end


    def initialize(topic, user)
      @assigned_by = user
      @topic = topic
    end

    def assign(assign_to, silent: false)
      @topic.custom_fields["assigned_to_id"] = assign_to.id
      @topic.custom_fields["assigned_by_id"] = @assigned_by.id
      @topic.save!

      first_post = @topic.posts.find_by(post_number: 1)
      first_post.publish_change_to_clients!(:revised,
            { reload_topic: true })


      UserAction.log_action!(action_type: UserAction::ASSIGNED,
                            user_id: assign_to.id,
                            acting_user_id: @assigned_by.id,
                            target_post_id: first_post.id,
                            target_topic_id: @topic.id)

      post_type = SiteSetting.assigns_public ? Post.types[:small_action] : Post.types[:whisper]

      unless silent
        @topic.add_moderator_post(@assigned_by,
                               I18n.t('discourse_assign.assigned_to',
                                       username: assign_to.username),
                               { bump: false,
                                 post_type: post_type,
                                 action_code: "assigned"})

        unless @assigned_by.id == assign_to.id

          Notification.create!(notification_type: Notification.types[:custom],
                             user_id: assign_to.id,
                             topic_id: @topic.id,
                             post_number: 1,
                             data: {
                               message: 'discourse_assign.assign_notification',
                               display_username: @assigned_by.username,
                               topic_title: @topic.title
                             }.to_json
                            )
        end
      end

      true
    end

    def unassign(silent: false)
      if assigned_to_id = @topic.custom_fields["assigned_to_id"]
        @topic.custom_fields["assigned_to_id"] = nil
        @topic.custom_fields["assigned_by_id"] = nil
        @topic.save!

        post = @topic.posts.where(post_number: 1).first
        post.publish_change_to_clients!(:revised, { reload_topic: true })

        assigned_user = User.find_by(id: assigned_to_id)

        UserAction.where(
          action_type: UserAction::ASSIGNED,
          target_post_id: post.id
        ).destroy_all

        # yank notification
        Notification.where(
           notification_type: Notification.types[:custom],
           user_id: assigned_user.try(:id),
           topic_id: @topic.id,
           post_number: 1
        ).where("data like '%discourse_assign.assign_notification%'")
         .destroy_all

        if SiteSetting.unassign_creates_tracking_post && !silent
          post_type = SiteSetting.assigns_public ? Post.types[:small_action] : Post.types[:whisper]
          @topic.add_moderator_post(@assigned_by,
                                 I18n.t('discourse_assign.unassigned'),
                                 { bump: false,
                                   post_type: post_type,
                                   action_code: "assigned"})
        end
      end
    end
  end

  class ::DiscourseAssign::AssignController < Admin::AdminController
    before_filter :ensure_logged_in

    def unassign
      topic_id = params.require(:topic_id)
      topic = Topic.find(topic_id.to_i)
      assigner = TopicAssigner.new(topic, current_user)
      assigner.unassign

      render json: success_json
    end

    def assign
      topic_id = params.require(:topic_id)
      username = params.require(:username)

      topic = Topic.find(topic_id.to_i)
      assign_to = User.find_by(username_lower: username.downcase)

      raise Discourse::NotFound unless assign_to

      assigner = TopicAssigner.new(topic, current_user)

      # perhaps?
      #Scheduler::Defer.later "assign topic" do
      assigner.assign(assign_to)

      render json: success_json
    end

    class ::Topic
      def assigned_to_user
        @assigned_to_user ||
          if user_id = custom_fields["assigned_to_id"]
            @assigned_to_user = User.find_by(id: user_id)
          end
      end

      def preload_assigned_to_user(assigned_to_user)
        @assigned_to_user = assigned_to_user
      end
    end

    TopicList.preloaded_custom_fields << "assigned_to_id"

    TopicList.on_preload do |topics, topic_list|
      is_staff = topic_list.current_user && topic_list.current_user.staff?
      allowed_access = SiteSetting.assigns_public || is_staff

      if allowed_access && topics.length > 0
        users = User.where("id in (
              SELECT value::int
              FROM topic_custom_fields
              WHERE name = 'assigned_to_id' AND topic_id IN (?)
        )", topics.map(&:id))
        .select(:id, :email, :username, :uploaded_avatar_id)

        map = {}
        users.each{|u| map[u.id] = u}

        topics.each do |t|
          if id = t.custom_fields['assigned_to_id']
            t.preload_assigned_to_user(map[id.to_i])
          end
        end
      end
    end

    require_dependency 'topic_query'
    TopicQuery.add_custom_filter(:assigned) do |results, topic_query|
      if topic_query.guardian.is_staff? || SiteSetting.assigns_public
        username = topic_query.options[:assigned]
        user_id = User.where(username_lower: username.downcase).pluck(:id).first if username.present? && username != "*"
        if user_id || username == "*"

          if username == "*"
            filter = "AND tc_assign.value IS NOT NULL"
          else
            filter = "AND tc_assign.value = '#{user_id.to_i.to_s}'"
          end

          results = results.joins("JOIN topic_custom_fields tc_assign ON
                                    topics.id = tc_assign.topic_id AND
                                    tc_assign.name = 'assigned_to_id'
                                    #{filter}
                                  ")
        end
      end

      results
    end

    require_dependency 'topic_list_item_serializer'
    class ::TopicListItemSerializer
      has_one :assigned_to_user, serializer: BasicUserSerializer, embed: :objects

      def include_assigned_to_user?
        (SiteSetting.assigns_public || scope.is_staff?) && object.assigned_to_user
      end
    end

    require_dependency 'topic_view_serializer'
    class ::TopicViewSerializer
      attributes :assigned_to_user

      def assigned_to_user
        if assigned_to_user_id && user = User.find_by(id: assigned_to_user_id)

          assigned_at = TopicCustomField.where(
            topic_id: object.topic.id,
            name: "assigned_to_id"
          ).pluck(:created_at).first

          {
            username: user.username,
            name: user.name,
            avatar_template: user.avatar_template,
            assigned_at: assigned_at
          }
        end
      end

      def include_assigned_to_user?
        if SiteSetting.assigns_public ||  scope.is_staff?
          # subtle but need to catch cases where stuff is not assigned
          object.topic.custom_fields.keys.include?("assigned_to_id")
        end
      end

      def assigned_to_user_id
        id = object.topic.custom_fields["assigned_to_id"]
        # a bit messy but race conditions can give us an array here, avoid
        id && id.to_i rescue nil
      end
    end

    require_dependency 'topic_query'
    class ::TopicQuery
      def list_private_messages_assigned(user)
        list = private_messages_for(user, :user)
        list = list.where("topics.id IN (
            SELECT topic_id FROM topic_custom_fields WHERE name = 'assigned_to_id' AND value = ?
        )", user.id.to_s)
        create_list(:private_messages, {}, list)
      end
    end

    require_dependency 'list_controller'
    class ::ListController
      generate_message_route(:private_messages_assigned)
    end

    DiscourseAssign::Engine.routes.draw do
      put "/assign" => "assign#assign"
      put "/unassign" => "assign#unassign"
    end

    Discourse::Application.routes.append do
      mount ::DiscourseAssign::Engine, at: "/assign"
      get "topics/private-messages-assigned/:username" => "list#private_messages_assigned",
        as: "topics_private_messages_assigned", constraints: {username: /[\w.\-]+?/}
    end
  end


  on(:post_created) do |post|
    ::TopicAssigner.auto_assign(post, force: true)
  end

  on(:post_edited) do |post, topic_changed|
    ::TopicAssigner.auto_assign(post, force: true)
  end

  on(:move_to_inbox) do |info|
    if SiteSetting.unassign_on_group_archive && info[:group]
      if topic = info[:topic]
        if user_id = topic.custom_fields["prev_assigned_to_id"]
          if user = User.find_by(id: user_id.to_i)
            assigner = TopicAssigner.new(topic, Discourse.system_user)
            assigner.assign(user, silent: true)
          end
        end
      end
    end
  end

  on(:archive_message) do |info|
    if SiteSetting.unassign_on_group_archive && info[:group]
      topic = info[:topic]
      if user_id = topic.custom_fields["assigned_to_id"]
        if user = User.find_by(id: user_id.to_i)
          topic.custom_fields["prev_assigned_to_id"] = user.id
          topic.save
          assigner = TopicAssigner.new(topic, Discourse.system_user)
          assigner.unassign(silent: true)
        end
      end
    end
  end

end
