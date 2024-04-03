import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class Assignment extends Component {
  @service siteSettings;
  @service taskActions;

  constructor() {
    super(...arguments);
  }

  get assignee() {
    return this.args.assignment.username || this.args.assignment.group_name;
  }

  get status() {
    return this.args.assignment.status || this.assignStatuses[0];
  }

  get assignStatuses() {
    return this.siteSettings.assign_statuses.split("|");
  }

  get assignStatusOptions() {
    return this.assignStatuses.map((status) => ({ id: status, name: status }));
  }

  get assigneeIsEmpty() {
    return !this.args.assignment.username && !this.args.assignment.group_name;
  }

  get showAssigneeIeEmptyError() {
    return this.assigneeIsEmpty && this.args.showValidationErrors;
  }

  @action
  handleTextAreaKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      this.args.onSubmit();
    }
  }

  @action
  setAssignee([newAssignee]) {
    this.assignee = newAssignee;

    if (this.taskActions.allowedGroupsForAssignment.includes(newAssignee)) {
      this.args.assignment.username = null;
      this.args.assignment.group_name = newAssignee;
    } else {
      this.args.assignment.username = newAssignee;
      this.args.assignment.group_name = null;
    }
  }
}
