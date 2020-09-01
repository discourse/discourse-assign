import CategoryDrop from "select-kit/components/category-drop";
import {
  NO_CATEGORIES_ID,
  ALL_CATEGORIES_ID
} from "select-kit/components/category-drop";

export default CategoryDrop.extend({
  actions: {
    onChange(categoryId) {
      if (categoryId === ALL_CATEGORIES_ID) {
        this.set("categoryId", null);
      } else if (categoryId === NO_CATEGORIES_ID) {
        this.set("categoryId", -1);
      } else {
        this.set("categoryId", categoryId);
      }
    }
  }
});
