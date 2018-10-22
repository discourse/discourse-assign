import { ajax } from "discourse/lib/ajax";
import computed from "ember-addons/ember-computed-decorators";

export default Ember.Controller.extend({
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
            }).then(() => this.send("unassignedAll"));
          }
        }
      );
    }
  }
});
