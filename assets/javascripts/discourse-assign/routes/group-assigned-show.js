import DiscourseRoute from "discourse/routes/discourse";
import { findOrResetCachedTopicList } from "discourse/lib/cached-topic-list";

export default DiscourseRoute.extend({
  beforeModel(transition) {
    if (!(transition.hasOwnProperty("from") && transition.from)) {
      return;
    }
    if (transition.from.localName === "show") {
      this.session.set("topicListScrollPosition", 1);
    }
  },

  model(params) {
    let filter = null;
    if (
      ["everyone", this.modelFor("group").get("name")].includes(params.filter)
    ) {
      filter = `topics/group-topics-assigned/${this.modelFor("group").get(
        "name"
      )}`;
    } else {
      filter = `topics/messages-assigned/${params.filter}`;
    }
    const lastTopicList = findOrResetCachedTopicList(this.session, filter);
    return lastTopicList
      ? lastTopicList
      : this.store.findFiltered("topicList", {
          filter,
          params: {
            order: params.order,
            ascending: params.ascending,
            search: params.search,
            direct: params.filter !== "everyone",
          },
        });
  },

  setupController(controller, model) {
    controller.setProperties({
      model,
      search: this.currentModel.params.search,
    });
  },

  renderTemplate() {
    this.render("group-topics-list");
  },
});
