import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class TopicAssignments extends Component {
  @tracked selectedAssignmentId = 0;
  TOPIC_ID = 0;

  get topicAssignment() {
    return this.args.assignments[0];
  }

  get assignmentOptions() {
    const topicAssignment = { id: this.TOPIC_ID, name: "Topic" };
    return [topicAssignment];
  }
}
