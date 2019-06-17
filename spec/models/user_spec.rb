# frozen_string_literal: true

require 'rails_helper'

RSpec.describe User do
  let(:group) { Fabricate(:group) }

  before do
    SiteSetting.assign_enabled = true
    SiteSetting.assign_allowed_on_groups = group.name
  end

  describe '.assign_allowed' do
    it 'retrieves the user when is a member of an allowed group' do
      user = Fabricate(:user)
      group.add(user)

      expect(User.assign_allowed).to include(user)
    end

    it "doesn't retrieve the user when is not a member of an allowed group" do
      non_assign_allowed_user = Fabricate(:user)

      expect(User.assign_allowed).not_to include(non_assign_allowed_user)
    end

    it 'retrieves the user if is an admin' do
      admin = Fabricate(:admin)

      expect(User.assign_allowed).to include(admin)
    end

    it 'retrieves the user if is an moderator' do
      moderator = Fabricate(:moderator)

      expect(User.assign_allowed).to include(moderator)
    end
  end

  describe '#can_assign?' do
    it 'allows member of allowed groups to assign' do
      user = Fabricate.build(:user)
      group.add(user)

      expect(user.can_assign?).to eq true
    end

    it "doesn't allow non allowed users to assign" do
      user = Fabricate.build(:user)

      expect(user.can_assign?).to eq false
    end

    it 'allows staff members to assign' do
      admin = Fabricate.build(:admin)

      expect(admin.can_assign?).to eq true
    end
  end
end
