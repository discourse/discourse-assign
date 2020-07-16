import Route from "@ember/routing/route";
import { ajax } from "discourse/lib/ajax";

export default Route.extend({
  queryParams: {
    offset: { refreshModel: true },
  },

  model(params) {
    return ajax(`/assign/members/${this.modelFor("group").get("name")}.json`,
      { offset: params.offset }
    );
  },

  redirect(model, transition) {
    if (transition.to.params.hasOwnProperty("filter")) {
      this.transitionTo("group.assignments.show", transition.to.params.filter);
    } else {
      this.transitionTo("group.assignments.show", "everyone");
    }
  }
});
