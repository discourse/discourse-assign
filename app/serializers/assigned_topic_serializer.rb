# frozen_string_literal: true

class AssignedTopicSerializer < BasicTopicSerializer
  include TopicTagsMixin

  attributes :excerpt,
             :category_id,
             :created_at,
             :updated_at

  has_one :user, serializer: BasicUserSerializer, embed: :objects
  has_one :assigned_to_user, serializer: AssignedUserSerializer, embed: :objects
end
