import TagDrop from "select-kit/components/tag-drop";
import { NO_TAG_ID, ALL_TAGS_ID } from "select-kit/components/tag-drop";

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
