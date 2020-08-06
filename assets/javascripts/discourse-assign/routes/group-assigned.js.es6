import DiscourseRoute from "discourse/routes/discourse";
import { ajax } from "discourse/lib/ajax";

export default DiscourseRoute.extend({
  queryParams: {
    filter: { refreshModel: true }
  },

  model(params) {
    return ajax(`/assign/members/${this.modelFor("group").get("name")}`, { type: "GET", data: { filter: params.filter } });
  },

  setupController(controller, model) {
    controller.setProperties({
      model,
      members: [],
      group: this.modelFor("group")
    });

    controller.findMembers(true);
  },

  redirect(model, transition) {
    if (transition.to.params.hasOwnProperty("filter")) {
      this.transitionTo("group.assigned.show", transition.to.params.filter);
    } else {
      this.transitionTo("group.assigned.show", "everyone");
    }
  }
});
