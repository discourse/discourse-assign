# frozen_string_literal: true

DiscourseAssign::Engine.routes.draw do
  put "/claim/:topic_id" => "assign#claim"
  put "/assign" => "assign#assign"
  put "/unassign" => "assign#unassign"
  get "/suggestions" => "assign#suggestions"
  get "/assigned" => "assign#assigned"
  get "/count/:group" => "assign#assignments_count"
  get "/assigned/:name" => "assign#group_assignments"
end
