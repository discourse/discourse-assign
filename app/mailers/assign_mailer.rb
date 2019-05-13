# frozen_string_literal: true

require_dependency 'email/message_builder'

class AssignMailer < ActionMailer::Base
  include Email::BuildEmailHelper

  def send_assignment(to_address, topic, assigned_by)
    opts = {
      template: 'assign_mailer',
      topic_title: topic.title,
      assignee_name: assigned_by.username,
      topic_excerpt: topic.excerpt,
      topic_link: "#{Discourse.base_url}/t/#{topic.slug}"
    }
    build_email(to_address, opts)
  end
end
