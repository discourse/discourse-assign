import { ajax } from "discourse/lib/ajax";
import showModal from "discourse/lib/show-modal";

export default Ember.Service.extend({
  unassign(topicId) {
    return ajax("/assign/unassign", {
      type: "PUT",
      data: { topic_id: topicId },
    });
  },

  assign(topic) {
    return showModal("assign-user", {
      model: {
        topic,
        username: topic.get("assigned_to_user.username"),
      },
    });
  },

  assignUserToTopic(user, topic) {
    return ajax("/assign/assign", {
      type: "PUT",
      data: {
        username: user.username,
        topic_id: topic.id,
      },
    });
  },
});
