//import { default as computed } from 'ember-addons/ember-computed-decorators';
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";

export default Ember.Controller.extend({
  taskActions: Ember.inject.service(),
  assignSuggestions: function() {
    ajax("/assign/suggestions").then(suggestions => {
      this.set("assignAllowedGroups", suggestions.assign_allowed_groups);
      this.set("assignSuggestions", suggestions.suggested_users);
    });
  }.property(),

  // @computed("username")
  // disabled(username) {
  //   return Ember.isEmpty(username);
  // },

  onClose() {
    if (this.get("model.onClose") && this.get("model.username")) {
      this.get("model.onClose")(this.get("model.username"));
    }
  },

  actions: {
    assignUser(user) {
      this.set("model.username", user.username);
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
