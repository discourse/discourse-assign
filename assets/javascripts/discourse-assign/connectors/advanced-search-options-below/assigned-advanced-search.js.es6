export default {
  shouldRender(args, component) {
    return component.currentUser && component.currentUser.can_assign;
  },

  actions: {
    onChangeAssigned(value) {
      if (this.onChangeSearchedTermField) {
        this.onChangeSearchedTermField("assigned", "_updateInRegex", value);
      } else {
        this.set("searchedTerms.assigned", value);
      }
    },
  },
};
