import Component from "@glimmer/component";
import AssignActionsDropdown from "./assign-actions-dropdown";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default class AssignedTopicListColumn extends Component {
  <template>
      {{#if @topic.assigned_to_user}}
        <AssignActionsDropdown
          @topic={{@topic}}
          @assignee={{@topic.assigned_to_user.username}}
          @unassign={{this.unassign}}
          @reassign={{this.reassign}}
        />
      {{else if @topic.assigned_to_group}}
        <AssignActionsDropdown
          @topic={{@topic}}
          @assignee={{@topic.assigned_to_group.name}}
          @group={{true}}
          @unassign={{this.unassign}}
          @reassign={{this.reassign}}
        />
      {{else}}
        <AssignActionsDropdown @topic={{@topic}} @unassign={{this.unassign}} />
      {{/if}}
  </template>

  @service taskActions;
  @service router;

  @action
  async unassign(targetId, targetType = "Topic") {
    await this.taskActions.unassign(targetId, targetType);
    this.router.refresh();
  }

  @action
  reassign(topic) {
    this.taskActions.showAssignModal(topic, {
      onSuccess: () => this.router.refresh(),
    });
  }
}
