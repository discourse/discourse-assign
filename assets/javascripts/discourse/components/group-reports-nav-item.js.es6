import { ajax } from "discourse/lib/ajax";

export default Ember.Component.extend({
  canAssign: false,
  assignmentsCount: 0,

  getAssignmentsCount() {
    ajax(`/assign/count/${this.group.name}.json`).then(response => {
      this.set("assignmentsCount", response.topic_list_count);
    });
  },

  init() {
    this._super(...arguments);
    this.set("canAssign", this.currentUser.can_assign);
    this.getAssignmentsCount();
  }
});
