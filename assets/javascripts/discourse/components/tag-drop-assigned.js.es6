import TagDrop from "select-kit/components/tag-drop";

export const NO_TAG_ID = "no-tags";
export const ALL_TAGS_ID = "all-tags";
export const NONE_TAG_ID = "none";

export default TagDrop.extend({
  actions: {
    onChange(tagId, tag) {
      switch (tagId) {
        case ALL_TAGS_ID:
          this.set("tagId", null);
          break;
        case NO_TAG_ID:
          this.set("tagId", 1);
          break;
        default:
          this.set("tagId", tagId.toLowerCase());
      }
    }
  }
})