require_dependency 'enum_site_setting'

class RemindAssignsFrequencySiteSettings < EnumSiteSetting

  def self.valid_value?(val)
    val.to_i.to_s == val.to_s &&
    values.any? { |v| v[:value] == val.to_i }
  end

  def self.values
    @values ||= [
      { name: 'discourse_assign.reminders_frequency.never', value: 0 },
      { name: 'discourse_assign.reminders_frequency.daily', value: 1440 },
      { name: 'discourse_assign.reminders_frequency.monthly', value: 43200 },
      { name: 'discourse_assign.reminders_frequency.quarterly', value: 131400 }
    ]
  end

  def self.translate_names?
    true
  end

  def self.frequency_for(minutes)
    value = values.detect { |v| v[:value] == minutes }

    raise Discourse::InvalidParameters(:task_reminders_frequency) if value.nil?

    I18n.t(value[:name])
  end
end
