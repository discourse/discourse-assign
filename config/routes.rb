DiscourseAssign::Engine.routes.draw do
  put "/claim/:topic_id" => "assign#claim"
  put "/assign" => "assign#assign"
  put "/unassign" => "assign#unassign"
  put "/unassign-all" => "assign#unassign_all"
  get "/suggestions" => "assign#suggestions"
end
