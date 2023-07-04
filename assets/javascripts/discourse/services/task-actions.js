import Service, { inject as service } from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import AssignUser from "../components/modal/assign-user";

export default class TaskActions extends Service {
  @service modal;

  unassign(targetId, targetType = "Topic") {
    return ajax("/assign/unassign", {
      type: "PUT",
      data: {
        target_id: targetId,
        target_type: targetType,
      },
    });
  }

  assign(target, options = { isAssigned: false, targetType: "Topic" }) {
    return this.modal.show(AssignUser, {
      model: {
        reassign: options.isAssigned,
        username: target.assigned_to_user?.username,
        group_name: target.assigned_to_group?.name,
        target,
        targetType: options.targetType,
        status: target.assignment_status,
      },
    });
  }

  reassignUserToTopic(user, target, targetType = "Topic") {
    return ajax("/assign/assign", {
      type: "PUT",
      data: {
        username: user.username,
        target_id: target.id,
        target_type: targetType,
        status: target.assignment_status,
      },
    });
  }
}
