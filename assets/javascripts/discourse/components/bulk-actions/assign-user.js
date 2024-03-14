import Component from "@glimmer/component";
import { action } from "@ember/object";
import { TrackedObject } from "@ember-compat/tracked-built-ins";
import { tracked } from '@glimmer/tracking';
//import Controller, { inject as controller } from "@ember/controller";

export default class AssignUser extends Component {
  @tracked onRegisterAction;

  model = new TrackedObject({});
  //@controller bulkTopicActions;

  // `submit` property will be mutated by the `AssignUserForm` component
  formApi = {
    submit() {},
  };

  @action
  async assign() {
    console.log('this assign');
    //return this.bulkTopicActions.performAndRefresh({
    return this.args.performAndRefresh({
      type: "assign",
      username: this.model.username,
      status: this.model.status,
      note: this.model.note,
    });
  }

  @action
  performRegistration() {
    console.log('performRegistration');
    if (this.onRegisterAction && typeof this.onRegisterAction === 'function') {
      this.onRegisterAction(this.assign.bind(this));
    }
  }
}
