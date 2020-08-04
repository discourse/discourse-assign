import DiscourseRoute from "discourse/routes/discourse";

export default DiscourseRoute.extend({
  queryParams: {
    order: { refreshModel: true },
    ascending: { refreshModel: true }
  },

  model(params) {
    let filter = null;
    if (params.filter !== "everyone") {
      filter = `topics/messages-assigned/${params.filter}`;
    } else {
      filter = `topics/group-topics-assigned/${this.modelFor("group").get(
        "name"
      )}`;
    }
    return this.store.findFiltered("topicList", {
      filter: filter,
      params: {
        order: params.order,
        ascending: params.ascending
      }
    });
  },

  renderTemplate() {
    this.render("group-topics-list");
  }

});
