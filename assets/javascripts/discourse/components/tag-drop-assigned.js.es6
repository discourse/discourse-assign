import TagDrop from "select-kit/components/tag-drop";

export default TagDrop.extend({
  actions: {
    onChange(tagId) {
      this.set("tagId", tagId.toLowerCase());
    },
  },
});
