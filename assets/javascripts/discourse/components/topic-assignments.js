import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";

export default class TopicAssignments extends Component {
  @tracked selectedAssignmentId = 0;
  @tracked selectedAssignment;
  TOPIC_ID = 0;

  constructor() {
    super(...arguments);
    this.selectedAssignment = this.args.assignments[0]; // fixme andrei
  }

  get assignmentOptions() {
    return this.args.assignments.map((a) => this.#toComboBoxOption(a));
  }

  synchronizeAssignment(selectedAssignmentId) {
    this.selectedAssignmentId = selectedAssignmentId;
    this.selectedAssignment = this.args.assignments[0]; // fixme andrei
  }

  #toComboBoxOption(assignment) {
    if (assignment.type === "Topic") {
      return { id: this.TOPIC_ID, name: "Topic" };
    } else {
      return null;
    }
  }
}
