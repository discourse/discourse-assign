import { inject as service } from "@ember/service";
import Controller, { inject as controller } from "@ember/controller";
import { ajax } from "discourse/lib/ajax";
import { observes } from "discourse-common/utils/decorators";
import discourseDebounce from "discourse/lib/debounce";

export default Controller.extend({
  router: service(),
  application: controller(),
  queryParams: ["filter"],
  loading: false,
  offset: 0,
  filterName: "",
  filter: "",

  @observes("filterName")
  _setFilter: discourseDebounce(function() {
    this.set("filter", this.filterName);
  }, 500),

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
