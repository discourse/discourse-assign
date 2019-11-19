# frozen_string_literal: true

require_dependency 'enum_site_setting'

class AssignMailerSiteSettings < EnumSiteSetting

  def self.valid_value?(val)
    values.any? { |v| v[:value].to_s == val.to_s }
  end

  def self.values
    @values ||= [
      { name: 'discourse_assign.assign_mailer.never', value: 'never' },
      { name: 'discourse_assign.assign_mailer.different_users', value: 'different_users' },
      { name: 'discourse_assign.assign_mailer.always', value: 'always' }
    ]
  end

  def self.translate_names?
    true
  end
end
