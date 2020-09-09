export default {
  actions: {
    onChangeSetting(value) {
      this.set(
        "category.custom_fields.enable_unassigned_filter",
        value ? "true" : "false"
      );
    },
  },
};
