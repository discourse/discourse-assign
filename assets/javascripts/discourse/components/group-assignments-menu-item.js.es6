export default Ember.Component.extend({
  canAssign: false,

  init() {
    this._super(...arguments);
    this.set(
      "displayAssignTab",
      this.currentUser &&
        this.currentUser.can_assign &&
        this.group.assignment_count > 0
    );
  }
});
