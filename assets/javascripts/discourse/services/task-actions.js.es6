import Service from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import showModal from "discourse/lib/show-modal";

export default Service.extend({
  unassign(topicId) {
    return ajax("/assign/unassign", {
      type: "PUT",
      data: { topic_id: topicId },
    });
  },

  assign(topic) {
    return showModal("assign-user", {
      model: {
        username: topic.get("assigned_to_user.username"),
        group_name: topic.get("assigned_to_group.name"),
        topic: topic,
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
