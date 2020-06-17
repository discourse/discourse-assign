import DiscourseRoute from "discourse/routes/discourse";

export default DiscourseRoute.extend({
  model() {
    return this.store.findFiltered("topicList", {
      filter: `topics/group-messages-assigned/${this.modelFor("group").get("display_name")}`,
    });
  },
});
