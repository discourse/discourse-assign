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
    if (this.model.onClose && this.model.username) {
      this.model.onClose(this.model.username);
    }
  },

  @action
  assignUser(user) {
    this.model.setProperties({
      username: user.username,
      allowedGroups: this.taskActions.allowedGroups
    });
    this.send("assign");
  },

  @action
  assign() {
    let path = "/assign/assign";

    if (isEmpty(this.model.username)) {
      path = "/assign/unassign";
      this.model.set("assigned_to_user", null);
    }

    this.send("closeModal");

    return ajax(path, {
      type: "PUT",
      data: {
        username: this.model.username,
        topic_id: this.model.topic.id
      }
    })
      .then(() => this.model.onSuccess && this.model.onSuccess())
      .catch(popupAjaxError);
  }
});
