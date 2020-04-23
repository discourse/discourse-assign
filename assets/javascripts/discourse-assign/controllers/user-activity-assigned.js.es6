import { action } from "@ember/object";
import UserTopicsList from "discourse/controllers/user-topics-list";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),
  taskActions: Ember.inject.service(),

  @action
  unassign(topic) {
    this.taskActions.unassign(topic.id).then(() => this.send("changeAssigned"));
  },

  @action
  reassign(topic) {
    const controller = this.taskActions.assign(topic);
    controller.set("model.onSuccess", () => this.send("changeAssigned"));
  }
});
