# frozen_string_literal: true

shared_context 'A group that is allowed to assign' do
  fab!(:assign_allowed_group) { Fabricate(:group, messageable_level: Group::ALIAS_LEVELS[:everyone]) }

  before do
    SiteSetting.assign_allowed_on_groups += "|#{assign_allowed_group.id}"
  end

  def add_to_assign_allowed_group(user)
    assign_allowed_group.add(user)
  end

  def get_assigned_allowed_group
    assign_allowed_group
  end

  def get_assigned_allowed_group_name
    assign_allowed_group.name
  end
end
