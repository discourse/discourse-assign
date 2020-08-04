import UserTopicsList from "discourse/controllers/user-topics-list";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),
  taskActions: Ember.inject.service(),
  groupController: Ember.inject.controller('group.assigned'),
  queryParams: ["order", "ascending"],
  order: null,
  ascending: false,

  actions: {
    unassign(topic) {
      this.taskActions
        .unassign(topic.get("id"))
        .then(() => {
          this.send("changeAssigned");
          this.get('groupController').refreshList();
        });
    },
    reassign(topic) {
      const controller = this.taskActions.assign(topic);
      controller.set("model.onSuccess", () => this.send("changeAssigned"));
    },
    changeSort(sortBy) {
      if (sortBy === this.order) {
        this.toggleProperty("ascending");
        this.model.refreshSort(sortBy, this.ascending);
      } else {
        this.setProperties({ order: sortBy, ascending: false });
        this.model.refreshSort(sortBy, false);
      }
    }
  }
});
