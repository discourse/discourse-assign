# frozen_string_literal: true

class Assignment < ActiveRecord::Base
  VALID_TYPES = %w(topic post).freeze

  belongs_to :topic
  belongs_to :assigned_to, polymorphic: true
  belongs_to :assigned_by_user, class_name: "User"
  belongs_to :target, polymorphic: true

  enum priority: {
    low: 4,
    medium: 3,
    high: 2,
    urgent: 1,
  }, _prefix: true

  scope :joins_with_topics, -> { joins("INNER JOIN topics ON topics.id = assignments.target_id AND assignments.target_type = 'Topic' AND topics.deleted_at IS NULL") }

  def self.valid_type?(type)
    VALID_TYPES.include?(type.downcase)
  end

  def assigned_to_user?
    assigned_to_type == 'User'
  end

  def assigned_to_group?
    assigned_to_type == 'Group'
  end
end

# == Schema Information
#
# Table name: assignments
#
#  id                  :bigint           not null, primary key
#  topic_id            :integer          not null
#  assigned_to_id      :integer          not null
#  assigned_by_user_id :integer          not null
#  created_at          :datetime         not null
#  updated_at          :datetime         not null
#  assigned_to_type    :string           not null
#  target_id           :integer          not null
#  target_type         :string           not null
#  active              :boolean          default(TRUE)
#  priority            :integer
#
# Indexes
#
#  index_assignments_on_active                               (active)
#  index_assignments_on_assigned_to_id_and_assigned_to_type  (assigned_to_id,assigned_to_type)
#  index_assignments_on_target_id_and_target_type            (target_id,target_type) UNIQUE
#  unique_target_and_assigned                                (assigned_to_id,assigned_to_type,target_id,target_type) UNIQUE
#
