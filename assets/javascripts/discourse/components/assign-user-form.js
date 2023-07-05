import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class AssignUserForm extends Component {
  @service taskActions;
  @service siteSettings;
  @service capabilities;

  @tracked assigneeError = false;
  @tracked assigneeName =
    this.args.model.username || this.args.model.group_name;

  get availableStatuses() {
    return this.siteSettings.assign_statuses
      .split("|")
      .map((status) => ({ id: status, name: status }));
  }

  get status() {
    return (
      this.args.model.status ||
      this.args.model.target.assignment_status ||
      this.siteSettings.assign_statuses.split("|")[0]
    );
  }

  @action
  handleTextAreaKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      this.assign();
    }
  }

  @action
  async assign() {
    if (!this.assigneeName) {
      this.assigneeError = true;
      return;
    }

    await this.args.assign();
  }

  @action
  assignUsername([name]) {
    this.assigneeName = name;
    this.assigneeError = false;

    if (this.taskActions.allowedGroupsForAssignment.includes(name)) {
      this.args.model.username = null;
      this.args.model.group_name = name;
    } else {
      this.args.model.username = name;
      this.args.model.group_name = null;
    }
  }
}
