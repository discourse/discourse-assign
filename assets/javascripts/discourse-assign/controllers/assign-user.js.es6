import { isEmpty } from "@ember/utils";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import { action } from "@ember/object";

export default Ember.Controller.extend({
  assignSuggestions: null,
  allowedGroups: null,
  taskActions: Ember.inject.service(),

  init() {
    this._super(...arguments);

    this.set("allowedGroups", []);

    ajax("/assign/suggestions").then(data =>
      this.setProperties({
        assignSuggestions: data.suggestions,
        allowedGroups: data.assign_allowed_on_groups
      })
    );
  },

  onClose() {
    if (this.get("model.onClose") && this.get("model.username")) {
      this.get("model.onClose")(this.get("model.username"));
    }
  },

  @action
  assignUser(user) {
    this.setProperties({
      "model.username": user.username,
      "model.allowedGroups": this.taskActions.allowedGroups
    });
    this.send("assign");
  },

  @action
  assign() {
    let path = "/assign/assign";

    if (isEmpty(this.get("model.username"))) {
      path = "/assign/unassign";
      this.set("model.assigned_to_user", null);
    }

    this.send("closeModal");

    return ajax(path, {
      type: "PUT",
      data: {
        username: this.get("model.username"),
        topic_id: this.get("model.topic.id")
      }
    })
      .then(() => {
        if (this.get("model.onSuccess")) {
          this.get("model.onSuccess")();
        }
      })
      .catch(popupAjaxError);
  }
});
