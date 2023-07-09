import Controller, { inject as controller } from "@ember/controller";
import { action } from "@ember/object";

export default class BulkAssign extends Controller {
  @controller topicBulkActions;

  model;
  formApi = {
    submit() {},
  };

  @action
  closeModal() {}

  @action
  async assign() {
    return this.topicBulkActions.performAndRefresh({
      type: "assign",
      username: this.model.username,
      note: this.model.note,
    });
  }
}
