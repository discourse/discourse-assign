import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";

export default class TopicAssignments extends Component {
  @tracked selectedAssignmentId;
  @tracked selectedAssignment;
  TOPIC_ID = 0; // fixme andrei

  constructor() {
    super(...arguments);
    this.synchronizeAssignment(this.TOPIC_ID); // fixme andrei
  }

  get assignmentOptions() {
    return this.args.assignments.map((a) => this.#toComboBoxOption(a));
  }

  @action
  synchronizeAssignment(selectedAssignmentId) {
    this.selectedAssignmentId = selectedAssignmentId;
    this.selectedAssignment = this.args.assignments.find(
      (a) => a.id === selectedAssignmentId
    ); // fixme andrei
  }

  #toComboBoxOption(assignment) {
    if (assignment.type === "Topic") {
      return { id: this.TOPIC_ID, name: "Topic" };
    } else {
      return {
        id: assignment.post_number,
        name: `Post #${assignment.post_number}`, // fixme andrei string
      };
    }
  }
}
