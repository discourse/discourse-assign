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
    if (this.isBulkAction) {
      this.bulkAction(this.model.username);
      return;
    }
    let path = "/assign/assign";

    if (isEmpty(this.get("model.username"))) {
      this.model.topic.set("assigned_to_user", null);
    }

    if (isEmpty(this.get("model.group_name"))) {
      this.model.topic.set("assigned_to_group", null);
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
        topic_id: this.get("model.topic.id"),
      },
    })
      .then(() => {
        if (this.get("model.onSuccess")) {
          this.get("model.onSuccess")();
        }
      })
      .catch(popupAjaxError);
  },

  @action
  assignUsername(selected) {
    this.assignUser(selected.firstObject);
  },
});
