import UserTopicsList from "discourse/controllers/user-topics-list";
import { alias } from "@ember/object/computed";
import discourseComputed from "discourse-common/utils/decorators";
import discourseDebounce from "discourse-common/lib/debounce";
import { INPUT_DELAY } from "discourse-common/config/environment";
import { inject as controller } from "@ember/controller";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default UserTopicsList.extend({
  user: controller(),
  taskActions: service(),
  order: "",
  ascending: false,
  search: "",
  bulkSelectEnabled: false,
  selected: [],
  canBulkSelect: alias("currentUser.staff"),

  queryParams: ["order", "ascending", "search"],

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
          direct: this.model.params.direct,
        },
      })
      .then((result) => this.set("model", result))
      .finally(() => {
        this.set("loading", false);
      });
  },

  @action
  unassign(targetId, targetType = "Topic") {
    this.taskActions
      .unassign(targetId, targetType)
      .then(() => this.send("changeAssigned"));
  },

  @action
  reassign(topic) {
    this.taskActions
      .assign(topic)
      .set("model.onSuccess", () => this.send("changeAssigned"));
  },

  @action
  changeSort(sortBy) {
    if (sortBy === this.order) {
      this.toggleProperty("ascending");
      this.refreshModel();
    } else {
      this.setProperties({ order: sortBy, ascending: false });
      this.refreshModel();
    }
  },

  @action
  onChangeFilter(value) {
    discourseDebounce(this, this._setSearchTerm, value, INPUT_DELAY * 2);
  },

  @action
  toggleBulkSelect() {
    this.toggleProperty("bulkSelectEnabled");
  },

  @action
  refresh() {
    this.refreshModel();
  },
});
