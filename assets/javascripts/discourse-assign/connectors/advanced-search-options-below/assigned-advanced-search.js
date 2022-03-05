import { action } from "@ember/object";

export default {
  shouldRender(args, component) {
    return component.currentUser?.can_assign;
  },

  @action
  onChangeAssigned(value) {
    this.onChangeSearchedTermField(
      "assigned",
      "updateSearchTermForAssignedUsername",
      value
    );
  },
};
