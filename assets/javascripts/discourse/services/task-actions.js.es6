import { ajax } from "discourse/lib/ajax";
import showModal from "discourse/lib/show-modal";

export default Ember.Service.extend({
  unassign(topicId) {
    return ajax("/assign/unassign", {
      type: "PUT",
      data: { topic_id: topicId }
    });
  },

  assign(topic) {
    return showModal("assign-user", {
      model: {
        topic: topic,
        username: topic.get("assigned_to_user.username")
      }
    });
  }
});
