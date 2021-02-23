import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { inject as controller } from "@ember/controller";
import discourseComputed from "discourse-common/utils/decorators";

export default Ember.Controller.extend({
  topicBulkActions: controller(),
  assignSuggestions: null,
  allowedGroups: null,
  taskActions: Ember.inject.service(),

  init() {
    this._super(...arguments);
    this.allowedGroups = [];

    ajax("/assign/suggestions").then((data) => {
      this.set("assignSuggestions", data.suggestions);
      this.set("allowedGroups", data.assign_allowed_on_groups);
    });
  },

  @discourseComputed("capabilities.touch")
  autofocus(touch) {
    return !touch;
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

  actions: {
    assignUser(user) {
      if (this.isBulkAction) {
        this.bulkAction(user.username);
        return;
      }
      this.setProperties({
        "model.username": user.username,
        "model.allowedGroups": this.taskActions.allowedGroups,
      });
      this.send("assign");
    },

    assign() {
      if (this.isBulkAction) {
        this.bulkAction(this.model.username);
        return;
      }
      let path = "/assign/assign";

      if (Ember.isEmpty(this.get("model.username"))) {
        path = "/assign/unassign";
        this.set("model.assigned_to_user", null);
      }

      this.send("closeModal");

      return ajax(path, {
        type: "PUT",
        data: {
          username: this.get("model.username"),
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

    updateUsername(selected) {
      this.set("model.username", selected.firstObject);
    },
  },
});
