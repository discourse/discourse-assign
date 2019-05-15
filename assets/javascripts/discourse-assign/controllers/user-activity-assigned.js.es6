import { ajax } from "discourse/lib/ajax";
import computed from "ember-addons/ember-computed-decorators";
import UserTopicsList from "discourse/controllers/user-topics-list";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),
  taskActions: Ember.inject.service(),

  actions: {
    unassign(topic) {
      this.get("taskActions")
        .unassign(topic.get("id"))
        .then(() => this.send("changeAssigned"));
    },
    reassign(topic) {
      const controller = this.get("taskActions").assign(topic);
      controller.set("model.onSuccess", () => this.send("changeAssigned"));
    }
  }
});
