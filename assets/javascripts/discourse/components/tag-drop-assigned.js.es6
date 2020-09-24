import TagDrop from "select-kit/components/tag-drop";
import { NO_TAG_ID, ALL_TAGS_ID } from "select-kit/components/tag-drop";

export default TagDrop.extend({
  actions: {
    onChange(tagId) {
      this.set("tagId", tagId.toLowerCase());
    },
  },
});
