import UserTopicsList from "discourse/controllers/user-topics-list";
import { debounce } from "@ember/runloop";
import { inject as controller } from "@ember/controller";
import discourseComputed from "discourse-common/utils/decorators";
import Category from "discourse/models/category";
import { alias } from "@ember/object/computed";
import { INPUT_DELAY } from "discourse-common/config/environment";

export default UserTopicsList.extend({
  user: Ember.inject.controller(),
  taskActions: Ember.inject.service(),
  order: null,
  ascending: false,
  q: "",
  tagId: null,
  categoryId: null,
  navigationCategory: controller("navigation/category"),
  noSubcategories: alias("navigationCategory.noSubcategories"),

  queryParams: ["order", "ascending", "q", "categoryId", "tagId"],

  _setSearchTerm(searchTerm) {
    this.set("q", searchTerm);
    this.refreshModel();
  },

  @discourseComputed("categoryId")
  category(categoryId) {
    return Category.findById(parseInt(categoryId, 10)) || null;
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
          category_id: this.categoryId,
          tagId: this.tagId
        }
      })
      .then(result => this.set("model", result))
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
    }
  }
});
