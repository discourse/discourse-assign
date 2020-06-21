import DiscourseRoute from "discourse/routes/discourse";

export default DiscourseRoute.extend({

  model(params) {
    if(params.filter === "everyone"){
      return this.store.findFiltered("topicList", {
        filter: `assign/assigned/${this.modelFor("group").get("display_name")}`,
      });
    }else{
      return this.store.findFiltered("topicList", {
        filter: `topics/messages-assigned/${params.filter}`,
        params: {
          // core is a bit odd here and is not sending an array, should be fixed
          exclude_category_ids: [-1]
        }
      });
    }
  },

  renderTemplate() {
    this.render("group-topics-list");
  },

  actions: {
    changeAssigned() {
      this.refresh();
    }
  }
});
