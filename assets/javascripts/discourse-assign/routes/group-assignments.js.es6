import Route from "@ember/routing/route";
import { ajax } from "discourse/lib/ajax";

export default Route.extend({
  model() {
    return ajax(`/assign/members/${this.modelFor("group").get("name")}`);
  },

  setupController(controller, model) {
    controller.setProperties({
      model,
      members: [],
      groupName: this.modelFor("group").get("name")
    });

    controller.findMembers(true);
  },

  redirect(model, transition) {
    if (transition.to.params.hasOwnProperty("filter")) {
      this.transitionTo("group.assignments.show", transition.to.params.filter);
    } else {
      this.transitionTo("group.assignments.show", "everyone");
    }
  }
});
