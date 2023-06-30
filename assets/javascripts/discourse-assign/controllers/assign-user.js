import Controller, { inject as controller } from "@ember/controller";
import ModalFunctionality from "discourse/mixins/modal-functionality";
import { action } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";
import { not, or } from "@ember/object/computed";
import { inject as service } from "@ember/service";
import { isEmpty } from "@ember/utils";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default class AssignUser extends Controller.extend(ModalFunctionality) {
  @service taskActions;
  @controller topicBulkActions;

  assignSuggestions = null;
  allowedGroups = null;
  assigneeError = false;

  @not("capabilities.touch") autofocus;
  @or("model.username", "model.group_name") assigneeName;

  constructor() {
    super(...arguments);

    this.set("allowedGroups", []);
    this.set("assigneeError", false);

    ajax("/assign/suggestions").then((data) => {
      if (this.isDestroying || this.isDestroyed) {
        return;
      }
      this.set("assignSuggestions", data.suggestions);
      this.set("allowedGroups", data.assign_allowed_on_groups);
      this.set("allowedGroupsForAssignment", data.assign_allowed_for_groups);
    });
  }

  onShow() {
    this.set("assigneeError", false);
  }

  onClose() {
    if (this.model.onClose && this.model.username) {
      this.model.onClose(this.model.username);
    }
  }

  bulkAction(username, note) {
    return this.topicBulkActions.performAndRefresh({
      type: "assign",
      username,
      note,
    });
  }

  @discourseComputed("siteSettings.enable_assign_status")
  statusEnabled() {
    return this.siteSettings.enable_assign_status;
  }

  @discourseComputed("siteSettings.assign_statuses")
  availableStatuses() {
    return this.siteSettings.assign_statuses.split("|").map((status) => {
      return { id: status, name: status };
    });
  }

  @discourseComputed("siteSettings.assign_statuses", "model.status")
  status() {
    return (
      this.model.status ||
      this.model.target.assignment_status ||
      this.siteSettings.assign_statuses.split("|")[0]
    );
  }

  @action
  handleTextAreaKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      this.assign();
    }
  }

  @action
  assign() {
    if (this.isBulkAction) {
      return this.bulkAction(this.model.username, this.model.note);
    }

    if (!this.assigneeName) {
      this.set("assigneeError", true);
      return;
    }

    let path = "/assign/assign";

    if (isEmpty(this.model.username)) {
      this.model.target.set("assigned_to_user", null);
    }

    if (isEmpty(this.model.group_name)) {
      this.model.target.set("assigned_to_group", null);
    }

    if (isEmpty(this.model.username) && isEmpty(this.model.group_name)) {
      path = "/assign/unassign";
    }

    this.send("closeModal");

    return ajax(path, {
      type: "PUT",
      data: {
        username: this.model.username,
        group_name: this.model.group_name,
        target_id: this.model.target.id,
        target_type: this.model.targetType,
        note: this.model.note,
        status: this.model.status,
      },
    })
      .then(() => {
        this.model.onSuccess?.();
      })
      .catch(popupAjaxError);
  }

  @action
  assignUsername([name]) {
    this.set("assigneeError", false);
    this.set("model.allowedGroups", this.taskActions.allowedGroups);

    if (this.allowedGroupsForAssignment.includes(name)) {
      this.setProperties({
        "model.username": null,
        "model.group_name": name,
      });
    } else {
      this.setProperties({
        "model.username": name,
        "model.group_name": null,
      });
    }
  }
}
