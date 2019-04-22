import { ajax } from "discourse/lib/ajax";
import showModal from "discourse/lib/show-modal";
import computed from "ember-addons/ember-computed-decorators";
import UserTopicsList from "discourse/controllers/user-topics-list";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),

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
      ajax("/assign/unassign", {
        type: "PUT",
        data: { topic_id: topic.get("id") }
      }).then(() => this.send("changeAssigned"));
    },
    reassign(topic) {
      showModal("assign-user", {
        model: {
          topic: topic,
          username: topic.get("assigned_to_user.username"),
          onSuccess: () => this.send("changeAssigned")
        }
      });
    }
  }
});
