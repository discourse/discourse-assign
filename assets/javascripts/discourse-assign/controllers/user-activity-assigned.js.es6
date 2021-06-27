import UserTopicsList from "discourse/controllers/user-topics-list";
import discourseComputed from "discourse-common/utils/decorators";
import discourseDebounce from "discourse-common/lib/debounce";
import { INPUT_DELAY } from "discourse-common/config/environment";
import { inject as controller } from "@ember/controller";
import { inject as service } from "@ember/service";

export default UserTopicsList.extend({
  user: controller(),
  taskActions: service(),
  queryParams: ["order", "ascending", "search"],
  order: "",
  ascending: false,
  search: "",

  @discourseComputed("search")
  searchTerm(search) {
    return search;
  },

  _setSearchTerm(searchTerm) {
    this.set("search", searchTerm);
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
          search: this.search,
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
      discourseDebounce(this, this._setSearchTerm, value, INPUT_DELAY * 2);
    },
  },
});
