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
  TOPIC_ID = 0;

  constructor() {
    super(...arguments);

    this.args.formApi.submit = this.assign;
    this.selectedTargetId = this.TOPIC_ID;
    this.args.model.updatedPostAssignments = new Map();
  }

  get assignments() {
    const topicAssignment = { id: this.TOPIC_ID, name: "Topic" };
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

    let username, groupName;
    if (this.taskActions.allowedGroupsForAssignment.includes(name)) {
      username = null;
      groupName = name;
    } else {
      username = name;
      groupName = null;
    }

    this.args.model.username = username;
    this.args.model.group_name = groupName;

    if (this.editingTopicAssignments) {
      const assignment = { username, groupName };
      this.args.model.updatedPostAssignments.set(
        this.selectedTargetId,
        assignment
      );
    }
  }

  @action
  synchronizeAssignee(selectedTargetId) {
    this.selectedTargetId = selectedTargetId;

    const topic = this.args.model.target;
    let assignee;
    if (selectedTargetId === this.TOPIC_ID) {
      assignee = topic.assigned_to_user;
    } else {
      const postNumber = selectedTargetId;
      assignee = topic.postAssignee(postNumber);
    }

    this.assigneeName = assignee.username;
  }
}
