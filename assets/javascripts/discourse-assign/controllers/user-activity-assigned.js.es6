import UserTopicsList from "discourse/controllers/user-topics-list";
import discourseComputed from "discourse-common/utils/decorators";
import discourseDebounce from "discourse-common/lib/debounce";
import { INPUT_DELAY } from "discourse-common/config/environment";
import { inject as controller } from "@ember/controller";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";
import getURL from "discourse-common/lib/get-url";
import { iconHTML } from "discourse-common/lib/icon-library";
import I18n from "I18n";

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

  @discourseComputed("model.topics.length", "search")
  doesntHaveAssignments(topicsLength, search) {
    return !search && !topicsLength;
  },

  @discourseComputed
  emptyStateBody() {
    return I18n.t("user.no_assignments_body", {
      preferencesUrl: getURL("/my/preferences/notifications"),
      icon: iconHTML("user-plus"),
    }).htmlSafe();
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
});
