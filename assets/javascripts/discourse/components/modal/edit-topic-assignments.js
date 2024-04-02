import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { TrackedObject } from "@ember-compat/tracked-built-ins";
import I18n from "I18n";

export default class EditTopicAssignments extends Component {
  @service taskActions;

  model = new TrackedObject(this.args.model);

  // `submit` property will be mutated by the `AssignUserForm` component
  formApi = {
    submit() {},
  };

  get title() {
    const title = this.model.topic.isAssigned() ? "reassign_title" : "title";
    return I18n.t(`discourse_assign.assign_modal.${title}`);
  }

  @action
  async onSubmit() {
    this.args.closeModal();
    await this.taskActions.assign(this.model);
  }
}
