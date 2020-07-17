# frozen_string_literal: true

class GroupUserAssignedSerializer < BasicUserSerializer
  include UserPrimaryGroupMixin

  attributes :name,
             :title,
             :last_posted_at,
             :last_seen_at,
             :added_at,
             :assignments_count,
             :timezone

  def include_assignments_count
    object.can_assign?
  end

  def include_added_at
    object.respond_to? :added_at
  end

end
