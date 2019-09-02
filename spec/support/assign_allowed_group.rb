# frozen_string_literal: true

shared_context 'A group that is allowed to assign' do
  fab!(:assign_allowed_group) { Fabricate(:group) }

  before { SiteSetting.assign_allowed_on_groups += "|#{assign_allowed_group.id}" }

  def add_to_assign_allowed_group(user)
    assign_allowed_group.add(user)
  end
end
