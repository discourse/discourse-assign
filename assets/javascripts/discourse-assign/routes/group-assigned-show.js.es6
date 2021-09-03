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
    if (params.filter === "everyone") {
      filter = `topics/group-topics-assigned/${this.modelFor("group").get(
        "name"
      )}`;
    } else if (params.filter === this.modelFor("group").get("name")) {
      filter = `topics/group-topics-assigned/${this.modelFor("group").get(
        "name"
      )}?direct=true`;
    } else {
      filter = `topics/messages-assigned/${params.filter}?direct=true`;
    }
    const lastTopicList = findOrResetCachedTopicList(this.session, filter);
    return lastTopicList
      ? lastTopicList
      : this.store.findFiltered("topicList", {
          filter: filter,
          params: {
            order: params.order,
            ascending: params.ascending,
            search: params.search,
          },
        });
  },

  setupController(controller, model) {
    controller.setProperties({
      model,
      searchTerm: this.currentModel.params.search,
    });
  },

  renderTemplate() {
    this.render("group-topics-list");
  },
});
