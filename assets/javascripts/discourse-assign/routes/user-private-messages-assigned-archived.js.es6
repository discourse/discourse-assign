import createPMRoute from "discourse/routes/build-private-messages-route";

export default createPMRoute('assigned_archived', 'private-messages-assigned', 'assigned/archive').extend({
  model() {
    return this.store.findFiltered("topicList", {
      filter: `topics/private-messages-assigned/${this.modelFor("user").get("username_lower")}`,
      params: { status: "archived" }
    });
  }
});
