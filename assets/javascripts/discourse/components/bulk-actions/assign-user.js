import Component from "@glimmer/component";
import { action } from "@ember/object";

export default class AssignUser extends Component {
  model = {};

  // `submit` property will be mutated by the `AssignUserForm` component
  formApi = {
    submit() {},
  };

  @action
  async assign() {
    return this.args.performAndRefresh({
      type: "assign",
      username: this.model.username,
      status: this.model.status,
      note: this.model.note,
    });
  }
}
