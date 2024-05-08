import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import DButton from "discourse/components/d-button";
import DropdownMenu from "discourse/components/dropdown-menu";
import icon from "discourse-common/helpers/d-icon";
import i18n from "discourse-common/helpers/i18n";
import DMenu from "float-kit/components/d-menu";

export default class AssignedToPost extends Component {
  @service taskActions;

  @action
  unassign() {
    this.taskActions.unassignPost(this.args.post);
  }

  @action
  editAssignment() {
    this.taskActions.showAssignPostModal(this.args.post);
  }

  <template>
    {{#if @assignedToUser}}
      {{icon "user-plus"}}
    {{else}}
      {{icon "group-plus"}}
    {{/if}}

    <span class="assign-text">
      {{i18n "discourse_assign.assigned_to"}}
    </span>

    <a href={{@href}} class="assigned-to-username">
      {{#if @assignedToUser}}
        {{@assignedToUser.username}}
      {{else}}
        {{@assignedToGroup.name}}
      {{/if}}
    </a>

    <DMenu
      @identifier="post-assign-menu"
      @icon="ellipsis-h"
      class="btn-flat more-button"
      @autofocus={{true}}
    >
      <DropdownMenu as |dropdown|>
        <dropdown.item>
          <DButton
            @action={{this.unassign}}
            @icon="user-plus"
            @label="discourse_assign.unassign.title"
            class="btn-transparent unassign-btn"
          />
        </dropdown.item>
        <dropdown.item>
          <DButton
            @action={{this.editAssignment}}
            @icon="group-plus"
            @label="discourse_assign.reassign.title_w_ellipsis"
            class="btn-transparent edit-assignment-btn"
          />
        </dropdown.item>
      </DropdownMenu>
    </DMenu>
  </template>
}
