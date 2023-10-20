import { inject as controller } from "@ember/controller";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { htmlSafe } from "@ember/template";
import UserTopicsList from "discourse/controllers/user-topics-list";
import { INPUT_DELAY } from "discourse-common/config/environment";
import discourseDebounce from "discourse-common/lib/debounce";
import getURL from "discourse-common/lib/get-url";
import { iconHTML } from "discourse-common/lib/icon-library";
import discourseComputed from "discourse-common/utils/decorators";
import I18n from "I18n";

export default class UserActivityAssigned extends UserTopicsList {
  @service taskActions;
  @controller user;

  queryParams = ["order", "ascending", "search"];
  order = "";
  ascending = false;
  search = "";

  @discourseComputed("model.topics.length", "search")
  doesntHaveAssignments(topicsLength, search) {
    return !search && !topicsLength;
  }

  @discourseComputed
  emptyStateBody() {
    return htmlSafe(
      I18n.t("user.no_assignments_body", {
        preferencesUrl: getURL("/my/preferences/notifications"),
        icon: iconHTML("user-plus"),
      })
    );
  }

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
        },
      })
      .then((result) => this.set("model", result))
      .finally(() => {
        this.set("loading", false);
      });
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
}
