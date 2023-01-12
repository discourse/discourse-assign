import { next } from "@ember/runloop";
import Controller, { inject as controller } from "@ember/controller";
import ModalFunctionality from "discourse/mixins/modal-functionality";
import { action } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";
import { not, or } from "@ember/object/computed";
import { inject as service } from "@ember/service";
import { isEmpty } from "@ember/utils";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default Controller.extend(ModalFunctionality, {
  topicBulkActions: controller(),
  assignSuggestions: null,
  allowedGroups: null,
  taskActions: service(),
  autofocus: not("capabilities.touch"),
  assigneeName: or("model.username", "model.group_name"),
  assigneeError: false,

  init() {
    this._super(...arguments);

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
  },

  onShow() {
    this.set("assigneeError", false);

    // Automatically expand user-chooser
    next(() => {
      document.querySelector(".assignee-chooser .select-kit-header")?.click();
    });
  },

  onClose() {
    if (this.get("model.onClose") && this.get("model.username")) {
      this.get("model.onClose")(this.get("model.username"));
    }
  },

  bulkAction(username) {
    return this.topicBulkActions.performAndRefresh({
      type: "assign",
      username,
    });
  },

  @discourseComputed("siteSettings.enable_assign_status")
  statusEnabled() {
    return this.siteSettings.enable_assign_status;
  },

  @discourseComputed("siteSettings.assign_statuses")
  availableStatuses() {
    return this.siteSettings.assign_statuses.split("|").map((status) => {
      return { id: status, name: status };
    });
  },

  @discourseComputed("siteSettings.assign_statuses", "model.status")
  status() {
    return (
      this.model.status ||
      this.model.target.assignment_status ||
      this.siteSettings.assign_statuses.split("|")[0]
    );
  },

  @action
  handleTextAreaKeydown(value, event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      this.assign();
    }
  },

  @action
  assign() {
    if (this.isBulkAction) {
      return this.bulkAction(this.model.username);
    }

    if (!this.assigneeName) {
      this.set("assigneeError", true);
      return;
    }

    let path = "/assign/assign";

    if (isEmpty(this.get("model.username"))) {
      this.model.target.set("assigned_to_user", null);
    }

    if (isEmpty(this.get("model.group_name"))) {
      this.model.target.set("assigned_to_group", null);
    }

    if (
      isEmpty(this.get("model.username")) &&
      isEmpty(this.get("model.group_name"))
    ) {
      path = "/assign/unassign";
    }

    this.send("closeModal");

    return ajax(path, {
      type: "PUT",
      data: {
        username: this.get("model.username"),
        group_name: this.get("model.group_name"),
        target_id: this.get("model.target.id"),
        target_type: this.get("model.targetType"),
        note: this.get("model.note"),
        status: this.get("model.status"),
      },
    })
      .then(() => {
        this.get("model.onSuccess")?.();
      })
      .catch(popupAjaxError);
  },

  @action
  assignUser(name) {
    if (this.isBulkAction) {
      return this.bulkAction(name);
    }

    this.setGroupOrUser(name);

    if (name) {
      return this.assign();
    }
  },

  @action
  assignUsername(selected) {
    if (this.isBulkAction) {
      return this.bulkAction(selected.firstObject);
    }

    this.setGroupOrUser(selected.firstObject);
  },

  setGroupOrUser(name) {
    this.set("assigneeError", false);
    if (this.allowedGroupsForAssignment.includes(name)) {
      this.setProperties({
        "model.username": null,
        "model.group_name": name,
        "model.allowedGroups": this.taskActions.allowedGroups,
      });
    } else {
      this.setProperties({
        "model.username": name,
        "model.group_name": null,
        "model.allowedGroups": this.taskActions.allowedGroups,
      });
    }
  },
});
