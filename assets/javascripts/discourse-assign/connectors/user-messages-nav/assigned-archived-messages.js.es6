import { shouldShowAssigned } from "discourse/plugins/discourse-assign/discourse-assign/connectors/user-messages-nav/assigned-messages";

export default {
  setupComponent() {
    this.set('classNames', ['archive']);
  },

  shouldRender(args, component) {
    return shouldShowAssigned(args, component);
  }
};
