# frozen_string_literal: true

class Assignment < ActiveRecord::Base
  VALID_TYPES = %w(topic post).freeze

  belongs_to :topic
  belongs_to :assigned_to, polymorphic: true
  belongs_to :assigned_by_user, class_name: "User"
  belongs_to :target, polymorphic: true

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
