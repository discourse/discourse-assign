# frozen_string_literal: true

DiscourseAssign::Engine.routes.draw do
  put "/claim/:topic_id" => "assign#claim"
  put "/assign" => "assign#assign"
  put "/unassign" => "assign#unassign"
  get "/suggestions" => "assign#suggestions"
  get "/assigned" => "assign#assigned"
  get "/members/:group_name" => "assign#group_members"
end
