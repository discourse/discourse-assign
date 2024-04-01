import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class Assignment extends Component {
  @service siteSettings;
  @service taskActions;

  @tracked assignee = this.args.model.username || this.args.model.group_name;

  constructor() {
    super(...arguments);
  }

  get status() {
    return this.args.status || this.#assignStatuses[0];
  }

  get assignStatusOptions() {
    return this.#assignStatuses.map((status) => ({ id: status, name: status }));
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
    // this.assigneeError = false; fixme andrei

    if (this.taskActions.allowedGroupsForAssignment.includes(newAssignee)) {
      this.args.model.username = null;
      this.args.model.group_name = newAssignee;
    } else {
      this.args.model.username = newAssignee;
      this.args.model.group_name = null;
    }
  }

  get #assignStatuses() {
    return this.siteSettings.assign_statuses.split("|");
  }
}
