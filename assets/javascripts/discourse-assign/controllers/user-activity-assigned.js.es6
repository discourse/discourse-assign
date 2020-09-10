import UserTopicsList from "discourse/controllers/user-topics-list";
import { debounce } from "@ember/runloop";
import discourseComputed from "discourse-common/utils/decorators";
import { INPUT_DELAY } from "discourse-common/config/environment";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),
  taskActions: Ember.inject.service(),
  queryParams: ["order", "ascending", "q"],
  order: null,
  ascending: false,
  q: "",

  @discourseComputed("q")
  searchTerm(q) {
    return q;
  },

  _setSearchTerm(searchTerm) {
    this.set("q", searchTerm);
    this.refreshModel();
  },

  refreshModel() {
    this.set("loading", true);
    this.store
      .findFiltered("topicList", {
        filter: this.model.filter,
        params: {
          order: this.order,
          ascending: this.ascending,
          q: this.q,
        },
      })
      .then((result) => this.set("model", result))
      .finally(() => {
        this.set("loading", false);
      });
  },

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
        this.refreshModel();
      } else {
        this.setProperties({ order: sortBy, ascending: false });
        this.refreshModel();
      }
    },
    onChangeFilter(value) {
      debounce(this, this._setSearchTerm, value, INPUT_DELAY * 2);
    },
  },
});
