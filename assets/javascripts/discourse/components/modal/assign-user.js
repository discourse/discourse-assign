import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { TrackedObject } from "@ember-compat/tracked-built-ins";
import I18n from "I18n";

export default class AssignUser extends Component {
  @service taskActions;

  model = new TrackedObject(this.args.model);

  // `submit` property will be mutated by the `AssignUserForm` component
  formApi = {
    submit() {},
  };

  get title() {
    if (this.model.targetType === "Post") {
      return I18n.t("discourse_assign.assign_post_modal.title");
    }

    if (this.editingTopicAssignments) {
      return I18n.t("discourse_assign.assign_modal.edit_assignments_title");
    } else {
      return I18n.t("discourse_assign.assign_modal.title");
    }
  }

  get editingTopicAssignments() {
    return this.model.targetType === "Topic" && this.model.reassign;
  }

  @action
  async onSubmit() {
    this.args.closeModal();
    await this.taskActions.assign(this.model);
  }
}
