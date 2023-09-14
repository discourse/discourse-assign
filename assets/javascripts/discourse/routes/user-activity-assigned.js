import I18n from "I18n";
import UserTopicListRoute from "discourse/routes/user-topic-list";
import cookie from "discourse/lib/cookie";
import { action } from "@ember/object";

export default class UserActivityAssigned extends UserTopicListRoute {
  templateName = "user-activity-assigned";
  controllerName = "user-activity-assigned";

  userActionType = 16;
  noContentHelpKey = "discourse_assigns.no_assigns";

  beforeModel() {
    if (!this.currentUser) {
      cookie("destination_url", window.location.href);
      this.transitionTo("login");
    }
  }

  model(params) {
    return this.store.findFiltered("topicList", {
      filter: `topics/messages-assigned/${
        this.modelFor("user").username_lower
      }`,
      params: {
        exclude_category_ids: [-1],
        order: params.order,
        ascending: params.ascending,
        search: params.search,
      },
    });
  }

  titleToken() {
    return I18n.t("discourse_assign.assigned");
  }
}
