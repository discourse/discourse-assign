import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class AssignUserForm extends Component {
  @service taskActions;
  @service siteSettings;
  @service capabilities;

  @tracked assigneeError = false;
  constructor() {
    super(...arguments);

    this.args.formApi.submit = this.assign;
  }

  @action
  async assign() {
    if (!(this.args.model.username || this.args.model.group_name)) {
      this.assigneeError = true;
      return;
    }

    await this.args.onSubmit();
  }
}
