# frozen_string_literal: true

class AssignedUserSerializer < BasicUserSerializer
  attributes :custom_fields

  def custom_fields
    fields = User.whitelisted_user_custom_fields(scope)

    result = {}
    fields.each do |k|
      result[k] = object.custom_fields[k] if object.custom_fields[k].present?
    end

    result
  end

end
