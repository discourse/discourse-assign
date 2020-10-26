import UserTopicsList from "discourse/controllers/user-topics-list";
import { alias } from "@ember/object/computed";
import { debounce } from "@ember/runloop";
import discourseComputed, { observes } from "discourse-common/utils/decorators";
import Category from "discourse/models/category";
import { INPUT_DELAY } from "discourse-common/config/environment";
import { NO_TAG_ID, ALL_TAGS_ID } from "select-kit/components/tag-drop";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),
  taskActions: Ember.inject.service(),
  order: "",
  ascending: false,
  no_tags: "",
  tags: "",
  categoryId: null,
  navigationCategory: Ember.inject.controller("navigation/category"),
  noSubcategories: alias("navigationCategory.noSubcategories"),
  search: "",
  bulkSelectEnabled: false,
  selected: [],
  canBulkSelect: alias("currentUser.staff"),

  queryParams: [
    "order",
    "ascending",
    "search",
    "categoryId",
    "tags",
    "no_tags",
  ],

  @discourseComputed("search")
  searchTerm(search) {
    return search;
  },

  _setSearchTerm(searchTerm) {
    this.set("search", searchTerm);
    this.refreshModel();
  },

  @observes("tagId")
  setQueryParams() {
    if (this.tagId === NO_TAG_ID) {
      this.set("no_tags", true);
      this.set("tags", "");
    } else if (this.tagId === ALL_TAGS_ID) {
      this.set("no_tags", false);
      this.set("tags", "");
    } else {
      this.set("no_tags", false);
      this.set("tags", this.tagId);
    }

    this.refreshModel();
  },

  @discourseComputed("categoryId")
  category(categoryId) {
    this.refreshModel();
    return Category.findById(parseInt(categoryId, 10)) || null;
  },

  refreshModel() {
    if (!this.model) {
      return;
    }

    this.set("loading", true);
    this.store
      .findFiltered("topicList", {
        filter: this.get("model.filter"),
        params: {
          order: this.order,
          ascending: this.ascending,
          category: this.categoryId,
          tags: this.tags,
          no_tags: this.no_tags,
          search: this.search,
        },
      })
      .then((result) => this.set("model", result))
      .finally(() => {
        this.set("loading", false);
      });
  },

  @discourseComputed()
  categories() {
    return this.site.get("categoriesList");
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
    toggleBulkSelect() {
      this.toggleProperty("bulkSelectEnabled");
    },
    refresh() {
      this.refreshModel();
    },
  },
});
