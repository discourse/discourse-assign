import UserTopicListRoute from "discourse/routes/user-topic-list";
import { ListItemDefaults } from "discourse/components/topic-list-item";

export default UserTopicListRoute.extend({
  userActionType: 16,
  noContentHelpKey: "discourse_assigns.no_assigns",

  model() {
    return this.store.findFiltered("topicList", {
      filter: `topics/messages-assigned/${this.modelFor("user").get(
        "username_lower"
      )}`,
      params: {
        // core is a bit odd here and is not sending an array, should be fixed
        exclude_category_ids: [-1]
      }
    });
  },

  renderTemplate() {
    // TODO: This has to be removed when 2.3 becomes the new stable version.
    const template = ListItemDefaults
      ? "user-assigned-topics"
      : "user-topics-list";
    this.render("user-activity-assigned");
    this.render(template, { into: "user-activity-assigned" });
  },

  setupController(controller, model) {
    this._super(controller, model);
    controller.set("model", model);
  },

  actions: {
    changeAssigned() {
      this.refresh();
    }
  }
});
