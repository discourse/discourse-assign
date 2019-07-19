import { ajax } from "discourse/lib/ajax";
import showModal from "discourse/lib/show-modal";
import { getOwner } from "discourse-common/lib/get-owner";

export default Ember.Service.extend({
  init() {
    this._super(...arguments);

    this.allowedGroups = getOwner(this)
      .lookup("site-settings:main")
      .assign_allowed_on_groups.split("|");
  },

  unassign(topicId) {
    return ajax("/assign/unassign", {
      type: "PUT",
      data: { topic_id: topicId }
    });
  },

  assign(topic) {
    return showModal("assign-user", {
      model: {
        topic,
        username: topic.get("assigned_to_user.username"),
        allowedGroups: this.allowedGroups
      }
    });
  }
});
