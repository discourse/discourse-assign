import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class AssignUserForm extends Component {
  @service taskActions;
  @service siteSettings;
  @service capabilities;

  @tracked assigneeError = false;
  @tracked
  assigneeName = this.args.model.username || this.args.model.group_name;
  TOPIC = 0;

  constructor() {
    super(...arguments);

    this.args.formApi.submit = this.assign;
    this.selectedTargetId = this.TOPIC;
  }

  get assignments() {
    const topicAssignment = { id: this.TOPIC, name: "Topic" };
    return [topicAssignment, ...this.postAssignments];
  }

  get postAssignments() {
    if (this.args.model.targetType !== "Topic") {
      return [];
    }

    const topic = this.args.model.target;
    if (
      !topic.indirectly_assigned_to ||
      !Object.keys(topic.indirectly_assigned_to).length
    ) {
      return [];
    }

    return Object.values(topic.indirectly_assigned_to).map((value) => {
      return { id: value.post_number, name: `Post #${value.post_number}` };
    });
  }

  get availableStatuses() {
    return this.siteSettings.assign_statuses
      .split("|")
      .map((status) => ({ id: status, name: status }));
  }

  get editingTopicAssignments() {
    return this.args.model.targetType === "Topic" && this.args.model.reassign;
  }

  get status() {
    return (
      this.args.model.status || this.siteSettings.assign_statuses.split("|")[0]
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

    await this.args.onSubmit();
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

  @action
  synchronizeAssignee(selectedTargetId) {
    const topic = this.args.model.target;

    this.selectedTargetId = selectedTargetId;
    if (selectedTargetId === this.TOPIC) {
      this.assigneeName = topic.assigned_to_user.username;
    } else {
      const assignment = Object.values(topic.indirectly_assigned_to).find(
        (v) => v.post_number === selectedTargetId
      );
      this.assigneeName = assignment.assigned_to.username;
    }
  }
}
