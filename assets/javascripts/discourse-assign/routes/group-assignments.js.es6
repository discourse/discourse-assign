import DiscourseRoute from "discourse/routes/discourse";

export default DiscourseRoute.extend({

  model() {
    return this.store.findFiltered("topicList", {
      filter: `assign/assigned/${this.modelFor("group").get("display_name")}`,
    });
  },

  renderTemplate() {
    this.render("group-topics-list");
  },

});
