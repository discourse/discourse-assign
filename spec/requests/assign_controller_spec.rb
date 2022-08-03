# frozen_string_literal: true

require "rails_helper"
require_relative "../support/assign_allowed_group"

RSpec.describe DiscourseAssign::AssignController do
  before { SiteSetting.assign_enabled = true }

  fab!(:default_allowed_group) { Group.find_by(name: "staff") }
  let(:user) do
    Fabricate(:admin, groups: [default_allowed_group], name: "Robin Ward", username: "eviltrout")
  end
  fab!(:post) { Fabricate(:post) }
  fab!(:user2) do
    Fabricate(:active_user, name: "David Tylor", username: "david", groups: [default_allowed_group])
  end
  let(:nonadmin) { Fabricate(:user, groups: [default_allowed_group]) }
  fab!(:normal_user) { Fabricate(:user) }
  fab!(:normal_admin) { Fabricate(:admin) }

  context "only allow users from allowed groups" do
    before { sign_in(user2) }

    it "filters requests where current_user is not member of an allowed group" do
      SiteSetting.assign_allowed_on_groups = ""

      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            username: user2.username,
          }

      expect(response.status).to eq(403)
    end

    it "filters requests where assigne group is not allowed" do
      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            group_name: default_allowed_group.name,
          }

      expect(response.status).to eq(400)
    end

    describe "#suggestions" do
      before { sign_in(user) }

      it "includes users in allowed groups" do
        allowed_group = Group.find_by(name: "everyone")
        allowed_group.add(user2)

        defaults = "#{default_allowed_group.id}|#{allowed_group.id}"

        SiteSetting.assign_allowed_on_groups = defaults
        Assigner.new(post.topic, user).assign(user2)

        get "/assign/suggestions.json"
        suggestions = JSON.parse(response.body)["suggestions"].map { |u| u["username"] }

        expect(suggestions).to contain_exactly(user2.username, user.username)
      end

      it "does not include users from disallowed groups" do
        allowed_group = Group.find_by(name: "everyone")
        allowed_group.add(user2)
        SiteSetting.assign_allowed_on_groups = default_allowed_group.id.to_s
        Assigner.new(post.topic, user).assign(user2)

        get "/assign/suggestions.json"
        suggestions = JSON.parse(response.body)["suggestions"].map { |u| u["username"] }.sort

        expect(suggestions).to eq(%w[david eviltrout])
      end

      it "does include only visible assign_allowed_on_groups" do
        sign_in(nonadmin) # Need to use nonadmin to test. Admins can see all groups

        visible_group = Fabricate(:group, visibility_level: Group.visibility_levels[:members])
        visible_group.add(nonadmin)
        invisible_group = Fabricate(:group, visibility_level: Group.visibility_levels[:members])

        SiteSetting.assign_allowed_on_groups = "#{visible_group.id}|#{invisible_group.id}"

        get "/assign/suggestions.json"
        assign_allowed_on_groups = JSON.parse(response.body)["assign_allowed_on_groups"]

        expect(assign_allowed_on_groups).to contain_exactly(visible_group.name)
      end
    end
  end

  describe "#suggestions" do
    before do
      SiteSetting.max_assigned_topics = 1
      sign_in(user)
    end

    it "excludes other users from the suggestions when they already reached the max assigns limit" do
      another_admin = Fabricate(:admin, groups: [default_allowed_group])
      Assigner.new(post.topic, user).assign(another_admin)

      get "/assign/suggestions.json"
      suggestions = JSON.parse(response.body)["suggestions"].map { |u| u["username"] }

      expect(suggestions).to contain_exactly(user.username)
    end
  end

  describe "#assign" do
    include_context "A group that is allowed to assign"

    before do
      sign_in(user)
      add_to_assign_allowed_group(user2)
      SiteSetting.enable_assign_status = true
    end

    it "assigns topic to a user" do
      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            username: user2.username,
          }

      expect(response.status).to eq(200)
      expect(post.topic.reload.assignment.assigned_to_id).to eq(user2.id)
    end

    it "assigns topic with note to a user" do
      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            username: user2.username,
            note: "do dis pls",
          }

      expect(post.topic.reload.assignment.note).to eq("do dis pls")
    end

    it "assigns topic with a set status to a user" do
      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            username: user2.username,
            status: "In Progress",
          }

      expect(post.topic.reload.assignment.status).to eq("In Progress")
    end

    it "assigns topic with default status to a user" do
      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            username: user2.username,
          }

      expect(post.topic.reload.assignment.status).to eq("New")
    end

    it "assigns topic to a group" do
      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            group_name: assign_allowed_group.name,
          }

      expect(response.status).to eq(200)
      expect(post.topic.reload.assignment.assigned_to).to eq(assign_allowed_group)
    end

    it "fails to assign topic to the user if its already assigned to the same user" do
      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            username: user2.username,
          }

      expect(response.status).to eq(200)
      expect(post.topic.reload.assignment.assigned_to_id).to eq(user2.id)

      put "/assign/assign.json",
          params: {
            target_id: post.topic_id,
            target_type: "Topic",
            username: user2.username,
          }

      expect(response.status).to eq(400)
      expect(JSON.parse(response.body)["error"]).to eq(
        I18n.t("discourse_assign.already_assigned", username: user2.username),
      )
    end

    it "fails to assign topic to the user if they already reached the max assigns limit" do
      another_user = Fabricate(:user)
      add_to_assign_allowed_group(another_user)
      another_post = Fabricate(:post)
      max_assigns = 1
      SiteSetting.max_assigned_topics = max_assigns
      Assigner.new(post.topic, user).assign(another_user)

      put "/assign/assign.json",
          params: {
            target_id: another_post.topic_id,
            target_type: "Topic",
            username: another_user.username,
          }

      expect(response.status).to eq(400)
      expect(JSON.parse(response.body)["error"]).to eq(
        I18n.t(
          "discourse_assign.too_many_assigns",
          username: another_user.username,
          max: max_assigns,
        ),
      )
    end

    it "fails with a specific error message if the topic is a PM and the assignee can not see it" do
      pm = Fabricate(:private_message_post, user: user).topic
      another_user = Fabricate(:user)
      add_to_assign_allowed_group(another_user)
      put "/assign/assign.json",
          params: {
            target_id: pm.id,
            target_type: "Topic",
            username: another_user.username,
          }

      expect(response.parsed_body["error"]).to eq(
        I18n.t(
          "discourse_assign.forbidden_assignee_not_pm_participant",
          username: another_user.username,
        ),
      )
    end

    it "fails with a specific error message if the topic is not a PM and the assignee can not see it" do
      topic = Fabricate(:topic, category: Fabricate(:private_category, group: Fabricate(:group)))
      another_user = Fabricate(:user)
      add_to_assign_allowed_group(another_user)
      put "/assign/assign.json",
          params: {
            target_id: topic.id,
            target_type: "Topic",
            username: another_user.username,
          }

      expect(response.parsed_body["error"]).to eq(
        I18n.t(
          "discourse_assign.forbidden_assignee_cant_see_topic",
          username: another_user.username,
        ),
      )
    end
  end

  describe "#assigned" do
    include_context "A group that is allowed to assign"

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }
    fab!(:post3) { Fabricate(:post) }

    before do
      add_to_assign_allowed_group(user2)

      freeze_time 1.hour.from_now
      Assigner.new(post1.topic, user).assign(user)

      freeze_time 1.hour.from_now
      Assigner.new(post2.topic, user).assign(user2)

      freeze_time 1.hour.from_now
      Assigner.new(post3.topic, user).assign(user)

      sign_in(user)
    end

    it "lists topics ordered by user" do
      get "/assign/assigned.json"
      expect(JSON.parse(response.body)["topics"].map { |t| t["id"] }).to match_array(
        [post2.topic_id, post1.topic_id, post3.topic_id],
      )

      get "/assign/assigned.json", params: { limit: 2 }
      expect(JSON.parse(response.body)["topics"].map { |t| t["id"] }).to match_array(
        [post3.topic_id, post2.topic_id],
      )

      get "/assign/assigned.json", params: { offset: 2 }
      expect(JSON.parse(response.body)["topics"].map { |t| t["id"] }).to match_array(
        [post1.topic_id],
      )
    end

    context "with custom allowed groups" do
      let(:custom_allowed_group) { Fabricate(:group, name: "mygroup") }
      let(:other_user) { Fabricate(:user, groups: [custom_allowed_group]) }

      before { SiteSetting.assign_allowed_on_groups += "|#{custom_allowed_group.id}" }

      it "works for admins" do
        get "/assign/assigned.json"
        expect(response.status).to eq(200)
      end

      it "does not work for other groups" do
        sign_in(other_user)
        get "/assign/assigned.json"
        expect(response.status).to eq(403)
      end
    end
  end

  describe "#group_members" do
    include_context "A group that is allowed to assign"

    fab!(:post1) { Fabricate(:post) }
    fab!(:post2) { Fabricate(:post) }
    fab!(:post3) { Fabricate(:post) }

    before do
      add_to_assign_allowed_group(user2)
      add_to_assign_allowed_group(user)

      Assigner.new(post1.topic, user).assign(user)
      Assigner.new(post2.topic, user).assign(user2)
      Assigner.new(post3.topic, user).assign(user)
    end

    it "list members order by assignments_count" do
      sign_in(user)

      get "/assign/members/#{get_assigned_allowed_group_name}.json"
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)["members"].map { |m| m["id"] }).to match_array(
        [user.id, user2.id],
      )
    end

    it "doesn't include members with no assignments" do
      sign_in(user)
      add_to_assign_allowed_group(nonadmin)

      get "/assign/members/#{get_assigned_allowed_group_name}.json"
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)["members"].map { |m| m["id"] }).to match_array(
        [user.id, user2.id],
      )
    end

    it "returns members as according to filter" do
      sign_in(user)

      get "/assign/members/#{get_assigned_allowed_group_name}.json", params: { filter: "a" }
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)["members"].map { |m| m["id"] }).to match_array(
        [user.id, user2.id],
      )

      get "/assign/members/#{get_assigned_allowed_group_name}.json", params: { filter: "david" }
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)["members"].map { |m| m["id"] }).to match_array([user2.id])

      get "/assign/members/#{get_assigned_allowed_group_name}.json", params: { filter: "Tylor" }
      expect(response.status).to eq(200)
      expect(JSON.parse(response.body)["members"].map { |m| m["id"] }).to match_array([user2.id])
    end

    it "404 error to non-group-members" do
      sign_in(normal_user)

      get "/assign/members/#{get_assigned_allowed_group_name}.json"
      expect(response.status).to eq(403)
    end

    it "allows non-member-admin" do
      sign_in(normal_admin)

      get "/assign/members/#{get_assigned_allowed_group_name}.json"
      expect(response.status).to eq(200)
    end
  end
end
