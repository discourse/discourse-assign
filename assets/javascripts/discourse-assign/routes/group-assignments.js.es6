import Route from "@ember/routing/route";

export default Route.extend({
  model() {
    return this.modelFor("group");
  },

  setupController(controller, model) {
    controller.setProperties({
      model,
      showing: "members"
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
