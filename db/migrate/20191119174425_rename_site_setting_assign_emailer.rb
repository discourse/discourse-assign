# frozen_string_literal: true

class RenameSiteSettingAssignEmailer < ActiveRecord::Migration[6.0]
  def up
    execute "UPDATE site_settings
             SET name = 'assign_mailer', data_type = #{SiteSettings::TypeSupervisor.types[:enum]}
             WHERE name = 'assign_mailer_enabled' AND data_type = #{SiteSettings::TypeSupervisor.types[:enum]}"
  end

  def down
    raise ActiveRecord::IrreversibleMigration
  end
end
