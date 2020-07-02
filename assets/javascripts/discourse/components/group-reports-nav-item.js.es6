import { ajax } from "discourse/lib/ajax";

export default Ember.Component.extend({
  hasAssignments: false,

  checkAssignments() {
    ajax(`/assign/assigned/${this.group.name}.json`).then(response => {
      let render = this.currentUser.admin;
      if (
        (this.currentUser.hasOwnProperty("groups") &&
          this.currentUser.groups !== "undefined") ||
        !render
      ) {
        this.currentUser.groups.forEach(element => {
          if (element.name === this.attrs.group.value.name) {
            render = true;
            return false;
          }
        });
      }
      this.set(
        "hasAssignments",
        render &&
          this.siteSettings.assign_enabled &&
          response.topic_list.topics.length > 0
      );
    });
  },

  init() {
    this._super(...arguments);
    this.checkAssignments();
  }
});
