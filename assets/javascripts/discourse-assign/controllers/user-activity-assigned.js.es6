import { ajax } from "discourse/lib/ajax";
import computed from "ember-addons/ember-computed-decorators";
import UserTopicsList from "discourse/controllers/user-topics-list";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),
  taskActions: Ember.inject.service(),

  @computed("model.topics")
  canUnassignAll(topics) {
    return topics && topics.length && this.currentUser.get("staff");
  },

  actions: {
    unassignAll() {
      let user = this.get("user.model");
      bootbox.confirm(
        I18n.t("discourse_assign.unassign_all.confirm", {
          username: user.get("username")
        }),
        value => {
          if (value) {
            ajax("/assign/unassign-all", {
              type: "PUT",
              data: { user_id: user.get("id") }
            }).then(() => this.send("changeAssigned"));
          }
        }
      );
    },
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
