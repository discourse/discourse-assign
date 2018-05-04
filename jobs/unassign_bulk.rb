module Jobs
  class UnassignBulk < Jobs::Base
    def execute(args)
      assigned_by = User.find(args[:assigned_by_id])
      Topic.where(id: args[:topic_ids]).each do |t|
        TopicAssigner.new(t, assigned_by).unassign
      end
    end
  end
end
