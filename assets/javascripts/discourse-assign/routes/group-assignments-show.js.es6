import DiscourseRoute from "discourse/routes/discourse";

export default DiscourseRoute.extend({

  model(params) {
    let param = null;
    let route = null;
    if(params.filter !== "everyone"){
      param = {is_group: 0};
      route = params.filter;
    }else{
      route = this.modelFor("group").get("name");
    }
    return this.store.findFiltered("topicList", {
      filter: `assign/assigned/${route}`,
      params: param
    });
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
