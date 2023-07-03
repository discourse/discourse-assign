import UserTopicsList from "discourse/controllers/user-topics-list";
import { alias } from "@ember/object/computed";
import discourseDebounce from "discourse-common/lib/debounce";
import { INPUT_DELAY } from "discourse-common/config/environment";
import { inject as controller } from "@ember/controller";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default class GroupAssignedShow extends UserTopicsList {
  @service taskActions;
  @controller user;

  queryParams = ["order", "ascending", "search"];
  order = "";
  ascending = false;
  search = "";
  bulkSelectEnabled = false;
  selected = [];

  @alias("currentUser.staff") canBulkSelect;

  _setSearchTerm(searchTerm) {
    this.set("search", searchTerm);
    this.refreshModel();
  }

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
  }

  @action
  unassign(targetId, targetType = "Topic") {
    this.taskActions
      .unassign(targetId, targetType)
      .then(() => this.send("changeAssigned"));
  }

  @action
  reassign(topic) {
    this.taskActions
      .assign(topic)
      .set("model.onSuccess", () => this.send("changeAssigned"));
  }

  @action
  changeSort(sortBy) {
    if (sortBy === this.order) {
      this.toggleProperty("ascending");
      this.refreshModel();
    } else {
      this.setProperties({ order: sortBy, ascending: false });
      this.refreshModel();
    }
  }

  @action
  onChangeFilter(value) {
    discourseDebounce(this, this._setSearchTerm, value, INPUT_DELAY * 2);
  }

  @action
  toggleBulkSelect() {
    this.toggleProperty("bulkSelectEnabled");
  }

  @action
  refresh() {
    this.refreshModel();
  }
}
