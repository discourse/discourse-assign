import DiscourseRoute from "discourse/routes/discourse";
import { ajax } from "discourse/lib/ajax";

export default DiscourseRoute.extend({
  model() {
    return ajax(`/assign/members/${this.modelFor("group").get("name")}`);
  },

  setupController(controller, model) {
    controller.setProperties({
      model,
      members: [],
      group: this.modelFor("group")
    });
    controller.group.set("assignment_count", model.assignment_count);

    controller.findMembers(true);
  },

  redirect(model, transition) {
    if (transition.to.params.hasOwnProperty("filter")) {
      this.transitionTo("group.assigned.show", transition.to.params.filter);
    } else {
      this.transitionTo("group.assigned.show", "everyone");
    }
  },

  actions: {
    changeAssigned() {
      this.refresh();
    }
  }
});
