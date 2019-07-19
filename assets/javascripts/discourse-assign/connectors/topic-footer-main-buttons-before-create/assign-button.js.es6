import { getOwner } from "discourse-common/lib/get-owner";

export default {
  shouldRender(args, component) {
    const needsButton =
      component.currentUser && component.currentUser.get("can_assign");
    return (
      needsButton &&
      (!component.get("site.mobileView") || args.topic.get("isPrivateMessage"))
    );
  },

  setupComponent(args, component) {
    const taskActions = getOwner(this).lookup("service:task-actions");
    component.set("taskActions", taskActions);
  },

  actions: {
    unassign() {
      this.set("topic.assigned_to_user", null);
      this.taskActions.unassign(this.get("topic.id"));
    },
    assign() {
      this.taskActions.assign(this.topic);
    }
  }
};
