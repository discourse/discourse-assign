import UserTopicsList from "discourse/controllers/user-topics-list";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),
  taskActions: Ember.inject.service(),
  queryParams: ["order", "ascending", "q"],
  order: null,
  ascending: false,
  searchTerm: null,
  q: "",

  actions: {
    unassign(topic) {
      this.taskActions
        .unassign(topic.get("id"))
        .then(() => this.send("changeAssigned"));
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
    },
    search() {
      this.set("q", this.searchTerm);
    }
  }
});
