import Service from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import showModal from "discourse/lib/show-modal";

export default Service.extend({
  unassign(targetId, targetType = "Topic") {
    return ajax("/assign/unassign", {
      type: "PUT",
      data: {
        target_id: targetId,
        target_type: targetType,
      },
    });
  },

  assign(target, targetType = "Topic") {
    return showModal("assign-user", {
      model: {
        username: target.get("assigned_to_user.username"),
        group_name: target.get("assigned_to_group.name"),
        target,
        targetType,
      },
    });
  },

  assignUserToTopic(user, topic) {
    return ajax("/assign/assign", {
      type: "PUT",
      data: {
        username: user.username,
        target_id: topic.id,
        target_type: "Topic",
      },
    });
  },
});
