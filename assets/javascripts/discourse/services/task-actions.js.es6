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
      title: "discourse_assign.assign_modal.title",
      model: {
        username: target.get("assigned_to_user.username"),
        group_name: target.get("assigned_to_group.name"),
        target,
        targetType,
      },
    });
  },

  reassignUserToTopic(user, topic) {
    return ajax("/assign/reassign", {
      type: "PUT",
      data: {
        username: user.username,
        target_id: topic.id,
        target_type: "Topic",
      },
    });
  },

  reassign(topic) {
    return showModal("assign-user", {
      title: "discourse_assign.assign_modal.reassign_title",
      model: {
        reassign: true,
        username: topic.get("assigned_to_user.username"),
        group_name: topic.get("assigned_to_group.name"),
        topic,
      },
    });
  },
});
