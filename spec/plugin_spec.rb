# frozen_string_literal: true

require 'rails_helper'

describe 'plugin' do
  before { SiteSetting.assign_enabled = true }

  describe 'events' do
    describe 'on user_removed_from_group' do
      before do
        @topic = Fabricate(:post).topic
        @user = Fabricate(:user)
        @group_a = Fabricate(:group)
        @group_a.add(@user)
      end

      it 'unassigns the user' do
        SiteSetting.assign_allowed_on_groups = @group_a.id.to_s

        TopicAssigner.new(@topic, Discourse.system_user).assign(@user)
        @group_a.remove(@user)

        custom_fields = @topic.reload.custom_fields
        expect(custom_fields[TopicAssigner::ASSIGNED_TO_ID]).to be_nil
        expect(custom_fields[TopicAssigner::ASSIGNED_BY_ID]).to be_nil
      end

      it "doesn't unassign the user if it still has access through another group" do
        @group_b = Fabricate(:group)
        @group_b.add(@user)
        SiteSetting.assign_allowed_on_groups = [@group_a.id.to_s, @group_b.id.to_s].join('|')

        TopicAssigner.new(@topic, Discourse.system_user).assign(@user)
        @group_a.remove(@user)

        custom_fields = @topic.reload.custom_fields
        expect(custom_fields[TopicAssigner::ASSIGNED_TO_ID]).to eq(@user.id.to_s)
        expect(custom_fields[TopicAssigner::ASSIGNED_BY_ID]).to eq(Discourse::SYSTEM_USER_ID.to_s)
      end
    end
  end
end
