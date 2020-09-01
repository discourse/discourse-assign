import TagDrop from "select-kit/components/tag-drop";

export const NO_TAG_ID = "no-tags";
export const ALL_TAGS_ID = "all-tags";
export const NONE_TAG_ID = "none";

export default TagDrop.extend({
  actions: {
    onChange(tagId) {
      if (tagId === ALL_TAGS_ID) {
        this.set("tagId", ALL_TAGS_ID);
      } else if (tagId === NO_TAG_ID) {
        this.set("tagId", NO_TAG_ID);
      } else {
        this.set("tagId", tagId.toLowerCase());
      }
    }
  }
});
