import { action } from "@ember/object";

export default {
  @action
  onChangeSetting(value) {
    this.set(
      "category.custom_fields.enable_unassigned_filter",
      value ? "true" : "false"
    );
  },
};
