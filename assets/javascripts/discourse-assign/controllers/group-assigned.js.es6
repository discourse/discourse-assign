import { inject as service } from "@ember/service";
import Controller, { inject as controller } from "@ember/controller";
import { ajax } from "discourse/lib/ajax";
import discourseComputed, { observes } from "discourse-common/utils/decorators";
import discourseDebounce from "discourse/lib/debounce";

export default Controller.extend({
  router: service(),
  application: controller(),
  loading: false,
  offset: 0,
  filterName: "",
  filter: "",

  @discourseComputed("router.currentRoute.queryParams.order")
  order(order) {
    return order || "";
  },

  @discourseComputed("router.currentRoute.queryParams.ascending")
  ascending(ascending) {
    return ascending || false;
  },

  @discourseComputed("router.currentRoute.queryParams.q")
  q(q) {
    return q || "";
  },

  @discourseComputed("site.mobileView")
  isDesktop(mobileView) {
    return !mobileView;
  },

  @observes("filterName")
  _setFilter: discourseDebounce(function() {
    this.set("filter", this.filterName);
  }, 500),

  @observes("filter")
  _filterModel() {
    this.set("loading", true);
    this.set("offset", 0);
    ajax(`/assign/members/${this.group.name}`, {
      type: "GET",
      data: { filter: this.filter, offset: this.offset }
    }).then(result => {
      if (this.router.currentRoute.params.filter !== "everyone") {
        this.transitionToRoute("group.assigned.show", "everyone");
      }
      this.set("members", result.members);
      this.set("loading", false);
    });
  },

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
      ajax(`/assign/members/${this.group.name}`, {
        type: "GET",
        data: { filter: this.filter, offset: this.offset }
      }).then(result => {
        this.members.pushObjects(result.members);
        this.set("loading", false);
      });
    }
  },

  actions: {
    loadMore: function() {
      this.findMembers();
    }
  }
});
