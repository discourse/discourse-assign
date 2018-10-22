import showModal from "discourse/lib/show-modal";
import { ajax } from "discourse/lib/ajax";

export default {
  shouldRender(args, component) {
    const needsButton =
      component.currentUser && component.currentUser.get("staff");
    return (
      needsButton &&
      (!component.get("site.mobileView") || args.topic.get("isPrivateMessage"))
    );
  },

  actions: {
    unassign() {
      this.set("topic.assigned_to_user", null);

      return ajax("/assign/unassign", {
        type: "PUT",
        data: { topic_id: this.get("topic.id") }
      });
    },
    assign() {
      showModal("assign-user", {
        model: {
          topic: this.topic,
          username: this.topic.get("assigned_to_user.username")
        }
      });
    }
  }
};
