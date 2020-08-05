import { inject as service } from "@ember/service";
import Controller, { inject as controller } from "@ember/controller";
import { ajax } from "discourse/lib/ajax";
import { observes } from "discourse-common/utils/decorators";

export default Controller.extend({
  router: service(),
  application: controller(),
  loading: false,
  offset: 0,

  @observes("model.assignment_count")
  assignmentCountChanged() {
    this.set("group.assignment_count", this.model.assignment_count);
  },

  findMembers(refresh) {
    if (refresh) {
      this.set("members", this.model.members);
      return;
    }

    if (this.loading || !this.model) {
      return;
    }

    if (this.model.members.length >= this.offset + 50) {
      this.set("loading", true);
      this.set("offset", this.offset + 50);
      ajax(`/assign/members/${this.group.name}?offset=${this.offset}`).then(
        result => {
          this.members.pushObjects(result.members);
          this.set("loading", false);
        }
      );
    }
  },

  actions: {
    loadMore: function() {
      this.findMembers();
    }
  }
});
