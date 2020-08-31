import CategoryDrop from "select-kit/components/category-drop";

export const NO_CATEGORIES_ID = "no-categories";
export const ALL_CATEGORIES_ID = "all-categories";

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
