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

  assign(target, options = { isAssigned: false, targetType: "Topic" }) {
    return showModal("assign-user", {
      title:
        "discourse_assign.assign" +
        this.i18nSuffix(options.targetType) +
        `.${options.isAssigned ? "reassign_title" : "title"}`,
      model: {
        description:
          `discourse_assign.${options.isAssigned ? "reassign" : "assign"}` +
          this.i18nSuffix(options.targetType) +
          ".description",
        reassign: options.isAssigned,
        username: target.assigned_to_user?.username,
        group_name: target.assigned_to_group?.name,
        target,
        targetType: options.targetType,
        note: target.assignment_note,
      },
    });
  },

  reassignUserToTopic(user, target, targetType = "Topic") {
    return ajax("/assign/assign", {
      type: "PUT",
      data: {
        username: user.username,
        target_id: target.id,
        target_type: targetType,
        note: target.assignment_note,
      },
    });
  },
});
