import Controller, { inject as controller } from "@ember/controller";
import { inject as service } from "@ember/service";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { not, or } from "@ember/object/computed";
import { isEmpty } from "@ember/utils";
import { action } from "@ember/object";

export default Controller.extend({
  topicBulkActions: controller(),
  assignSuggestions: null,
  allowedGroups: null,
  taskActions: service(),
  autofocus: not("capabilities.touch"),
  assigneeName: or("model.username", "model.group_name"),

  init() {
    this._super(...arguments);
    this.allowedGroups = [];

    ajax("/assign/suggestions").then((data) => {
      this.set("assignSuggestions", data.suggestions);
      this.set("allowedGroups", data.assign_allowed_on_groups);
      this.set("allowedGroupsForAssignment", data.assign_allowed_for_groups);
    });
  },

  onClose() {
    if (this.get("model.onClose") && this.get("model.username")) {
      this.get("model.onClose")(this.get("model.username"));
    }
  },

  bulkAction(username) {
    this.topicBulkActions.performAndRefresh({
      type: "assign",
      username,
    });
  },

  reassignOrAssignTarget(assign_action) {
    if (this.isBulkAction) {
      this.bulkAction(this.model.username);
      return;
    }
    let path = "/assign/" + assign_action;

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
      },
    })
      .then(() => {
        this.get("model.onSuccess")?.()
      })
      .catch(popupAjaxError);
  },

  @action
  assignUser(name) {
    if (this.isBulkAction) {
      this.bulkAction(name);
      return;
    }

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

    if (name) {
      return this.assign();
    }
  },

  @action
  assign() {
    this.reassignOrAssignTarget("assign");
  },

  @action
  reassign() {
    this.reassignOrAssignTarget("reassign");
  },

  @action
  reassignUser(name) {
    if (this.isBulkAction) {
      this.bulkAction(name);
      return;
    }

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

    if (name) {
      return this.reassign();
    }
  },

  @action
  assignUsername(selected) {
    this.assignUser(selected.firstObject);
  },

  @action
  reassignUsername(selected) {
    this.reassignUser(selected.firstObject);
  },
});
