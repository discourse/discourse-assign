import Service, { inject as service } from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import AssignUser from "../components/modal/assign-user";
import { tracked } from "@glimmer/tracking";

export default class TaskActions extends Service {
  @service modal;

  @tracked allowedGroups;
  @tracked allowedGroupsForAssignment;
  #suggestionsPromise;
  @tracked _suggestions;

  get suggestions() {
    if (this._suggestions) {
      return this._suggestions;
    }

    this.#suggestionsPromise ||= this.#fetchSuggestions();

    return null;
  }

  async #fetchSuggestions() {
    const data = await ajax("/assign/suggestions");

    if (this.isDestroying || this.isDestroyed) {
      return;
    }

    this._suggestions = data.suggestions;
    this.allowedGroups = data.assign_allowed_on_groups;
    this.allowedGroupsForAssignment = data.assign_allowed_for_groups;
  }

  unassign(targetId, targetType = "Topic") {
    return ajax("/assign/unassign", {
      type: "PUT",
      data: {
        target_id: targetId,
        target_type: targetType,
      },
    });
  }

  assign(target, { isAssigned = false, targetType = "Topic", onSuccess }) {
    return this.modal.show(AssignUser, {
      model: {
        reassign: isAssigned,
        username: target.assigned_to_user?.username,
        group_name: target.assigned_to_group?.name,
        status: target.assignment_status,
        target,
        targetType,
        onSuccess,
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
