# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Group do
  describe 'Tracking changes that could affect the allow assign on groups site setting' do
    let(:group) { Fabricate(:group) }

    before do
      SiteSetting.assign_enabled = true
    end

    it 'updates the site setting when the group name changes' do
      SiteSetting.assign_allowed_on_groups = "#{group.name}|staff|moderators"
      different_name = 'different_name'

      group.update!(name: different_name)

      expect(SiteSetting.assign_allowed_on_groups).to eq "#{different_name}|staff|moderators"
    end

    let(:removed_group_setting) { 'staff|moderators' }

    it 'removes the group from the setting when the group gets destroyed' do
      SiteSetting.assign_allowed_on_groups = "#{group.name}|staff|moderators"

      group.destroy!

      expect(SiteSetting.assign_allowed_on_groups).to eq removed_group_setting
    end

    it 'removes the group from the setting when this is the last one on the list' do
      SiteSetting.assign_allowed_on_groups = "staff|moderators|#{group.name}"

      group.destroy!

      expect(SiteSetting.assign_allowed_on_groups).to eq removed_group_setting
    end

    it 'removes the group from the list when it is on the middle of the list' do
      SiteSetting.assign_allowed_on_groups = "staff|#{group.name}|moderators"

      group.destroy!

      expect(SiteSetting.assign_allowed_on_groups).to eq removed_group_setting
    end
  end
end
