import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import I18n from "I18n";

// fixme andrei validation?
export default class EditTopicAssignments extends Component {
  @service taskActions;
  @tracked assignments = [];

  constructor() {
    super(...arguments);
    const topicAssignment = {
      type: "Topic",
      username: this.topic.assigned_to_user?.username,
      group_name: this.topic.assigned_to_group?.name,
      status: this.topic.assignment_status,
      note: this.topic.assignment_note
    };
    this.assignments.push(topicAssignment);

    this.topic.assignedPosts().forEach((a) => {
      this.assignments.push({
        type: "Post",
        post_number: a.post_number,
        username: a.username,
        group_name: a.name,
        status: a.assignment_status,
        note: a.assignment_note,
      });
    });
  }

  get title() {
    const title = this.topic.isAssigned()
      ? "reassign_title"
      : "title";
    return I18n.t(`discourse_assign.assign_modal.${title}`);
  }

  get topic() {
    return this.args.model.topic;
  }

  @action
  async submit() {
    console.log("", this.assignments);
    throw "Not implemented"; // fixme andrei
    // this.args.closeModal();
    // await this.taskActions.assign(this.model);
  }
}
