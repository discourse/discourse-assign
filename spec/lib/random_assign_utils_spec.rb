# frozen_string_literal: true

require 'rails_helper'
require_relative '../support/assign_allowed_group'


describe RandomAssignUtils do
  before do
    SiteSetting.assign_enabled = true
  end

  let(:post) { Fabricate(:post) }

  describe '.recently_assigned_users_ids' do
    context 'no one has been assigned' do
      it 'returns an empty array' do
        assignees_ids = described_class.recently_assigned_users_ids(post.topic_id, 2.months.ago)
        expect(assignees_ids).to eq([])
      end
    end

    context 'users have been assigned' do
      let(:admin) { Fabricate(:admin) }
      let(:assign_allowed_group) { Group.find_by(name: 'staff') }
      let(:user_1) { Fabricate(:user, groups: [assign_allowed_group]) }
      let(:user_2) { Fabricate(:user, groups: [assign_allowed_group]) }
      let(:user_3) { Fabricate(:user, groups: [assign_allowed_group]) }

      it 'returns the recently assigned user ids' do
        freeze_time 1.months.ago do
          Assigner.new(post.topic, admin).assign(user_1)
          Assigner.new(post.topic, admin).assign(user_2)
        end

        freeze_time 3.months.ago do
          Assigner.new(post.topic, admin).assign(user_3)
        end

        assignees_ids = described_class.recently_assigned_users_ids(post.topic_id, 2.months.ago)

        expect(assignees_ids).to contain_exactly(user_1.id, user_2.id)
      end
    end
  end
end
