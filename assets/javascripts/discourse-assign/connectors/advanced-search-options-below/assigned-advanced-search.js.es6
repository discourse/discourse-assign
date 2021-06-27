import { action } from "@ember/object";

export default {
  shouldRender(args, component) {
    return component.currentUser && component.currentUser.can_assign;
  },

  @action
  onChangeAssigned(value) {
    if (this.onChangeSearchedTermField) {
      this.onChangeSearchedTermField("assigned", "updateInRegex", value);
    } else {
      this.set("searchedTerms.assigned", value);
    }
  },
};
