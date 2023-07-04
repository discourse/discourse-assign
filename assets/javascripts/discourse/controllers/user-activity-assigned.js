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
import { htmlSafe } from "@ember/template";

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
  async unassign(targetId, targetType = "Topic") {
    await this.taskActions.unassign(targetId, targetType);
    this.send("changeAssigned");
  }

  @action
  reassign(topic) {
    this.taskActions.assign(topic, {
      onSuccess: () => this.send("changeAssigned"),
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
