import { action } from "@ember/object";

export default {
  shouldRender(args, component) {
    return component.currentUser && component.currentUser.can_assign;
  },

  @action
  onChangeAssigned(value) {
    this.onChangeSearchedTermField(
      "assigned",
      "updateSearchTermForAssignedUsername",
      value
    );
    this.onChangeSearchedTermField("assigned", "updateInRegex", value);
  },
};
