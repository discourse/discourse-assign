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
    if (params.filter !== "everyone") {
      filter = `topics/messages-assigned/${params.filter}`;
    } else {
      filter = `topics/group-topics-assigned/${this.modelFor("group").get(
        "name"
      )}`;
    }
    const lastTopicList = findOrResetCachedTopicList(this.session, filter);
    return lastTopicList
      ? lastTopicList
      : this.store.findFiltered("topicList", {
          filter: filter,
          params: {
            order: params.order,
            ascending: params.ascending,
            category: params.categoryId,
            tags: params.tags,
            no_tags: params.no_tags,
            search: params.search,
          },
        });
  },

  setupController(controller, model) {
    controller.setProperties({
      model,
      tagId:
        this.currentModel.params.tags ||
        (this.currentModel.params.no_tags ? "no-tags" : "all-tags"),
    });
  },

  renderTemplate() {
    this.render("group-topics-list");
  },
});
