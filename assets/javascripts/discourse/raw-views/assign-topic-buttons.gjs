import EmberObject from "@ember/object";
import rawRenderGlimmer from "discourse/lib/raw-render-glimmer";
import AssignedTopicListColumn from "../components/assigned-topic-list-column";
import { inject as service } from "@ember/service";

const ASSIGN_LIST_ROUTES = ["userActivity.assigned", "group.assigned.show"];

export default class extends EmberObject {
  @service router;

  get html() {
    if (ASSIGN_LIST_ROUTES.includes(this.router.currentRouteName)) {
      return rawRenderGlimmer(
        this,
        "div.assign-topic-buttons",
        <template><AssignedTopicListColumn @topic={{@data.topic}} /></template>,
        { topic: this.topic }
      );
    }
  }
}
