import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default Ember.Controller.extend({
  assignSuggestions: null,
  taskActions: Ember.inject.service(),

  init() {
    this._super(...arguments);

    ajax("/assign/suggestions").then(users =>
      this.set("assignSuggestions", users)
    );
  },

  onClose() {
    if (this.get("model.onClose") && this.get("model.username")) {
      this.get("model.onClose")(this.get("model.username"));
    }
  },

  actions: {
    assignUser(user) {
      this.setProperties({
        "model.username": user.username,
        "model.allowedGroups": this.taskActions.allowedGroups
      });
      this.send("assign");
    },

    assign() {
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
  }
});
