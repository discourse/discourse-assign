import Category from "discourse/models/category";

export default {
  name: "extend-category-for-assign",

  before: "inject-discourse-objects",

  initialize() {
    Category.reopen({
      enable_unassigned_filter: Ember.computed(
        "custom_fields.enable_unassigned_filter",
        {
          get(fieldName) {
            // not sure how this is possible but appears to happen in some cases
            // in test
            if (!this && !this.custom_fields) {
              return false;
            }
            return Ember.get(this.custom_fields, fieldName) === "true";
          }
        }
      )
    });
  }
};
