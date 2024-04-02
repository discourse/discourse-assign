import Component from "@glimmer/component";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { inject as service } from "@ember/service";
import { TrackedObject } from "@ember-compat/tracked-built-ins";
import I18n from "I18n";

export default class EditTopicAssignments extends Component {
  @service taskActions;
  @tracked assignments = [];

  // fixme andrei
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
    throw "Not implemented";
    // this.args.closeModal();
    // await this.taskActions.assign(this.model);
  }
}
