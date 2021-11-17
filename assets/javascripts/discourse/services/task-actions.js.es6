import Service from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import showModal from "discourse/lib/show-modal";

export default Service.extend({
  i18nSuffix(targetType) {
    switch (targetType) {
      case "Post":
        return "_post_modal";
      case "Topic":
        return "_modal";
    }
  },

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
      title: "discourse_assign.assign" + this.i18nSuffix(targetType) + ".title",
      model: {
        description:
          "discourse_assign.assign" +
          this.i18nSuffix(targetType) +
          ".description",
        username: target.assigned_to_user?.username,
        group_name: target.assigned_to_group?.name,
        target,
        targetType,
      },
    });
  },

  reassignUserToTopic(user, target, isAssigned, targetType = "Topic") {
    const action = isAssigned ? "reassign" : "assign";
    return ajax(`/assign/${action}`, {
      type: "PUT",
      data: {
        username: user.username,
        target_id: target.id,
        target_type: targetType,
      },
    });
  },

  reassign(target, targetType = "Topic") {
    return showModal("assign-user", {
      title:
        "discourse_assign.assign" +
        this.i18nSuffix(targetType) +
        ".reassign_title",
      model: {
        description:
          "discourse_assign.reassign" +
          this.i18nSuffix(targetType) +
          ".description",
        reassign: true,
        username: target.assigned_to_user?.username,
        group_name: target.assigned_to_group?.name,
        target,
        targetType,
      },
    });
  },
});
