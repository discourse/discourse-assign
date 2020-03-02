# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Group do
  describe 'Tracking changes that could affect the allow assign on groups site setting' do
    let(:group) { Fabricate(:group) }

    before do
      SiteSetting.assign_enabled = true
    end

    let(:removed_group_setting) { '3|4' }
    let(:group_attribute) { group.id }

    it 'removes the group from the setting when the group gets destroyed' do
      SiteSetting.assign_allowed_on_groups = "#{group_attribute}|#{removed_group_setting}"

      group.destroy!

      expect(SiteSetting.assign_allowed_on_groups).to eq removed_group_setting
    end

    it 'removes the group from the setting when this is the last one on the list' do
      SiteSetting.assign_allowed_on_groups = "#{removed_group_setting}|#{group_attribute}"

      group.destroy!

      expect(SiteSetting.assign_allowed_on_groups).to eq removed_group_setting
    end

    it 'removes the group from the list when it is on the middle of the list' do
      allowed_groups = "3|#{group_attribute}|4"
      SiteSetting.assign_allowed_on_groups = allowed_groups

      group.destroy!

      expect(SiteSetting.assign_allowed_on_groups).to eq removed_group_setting
    end
  end
end
