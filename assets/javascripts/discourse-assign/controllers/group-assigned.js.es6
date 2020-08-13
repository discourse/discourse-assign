import { inject as service } from "@ember/service";
import Controller, { inject as controller } from "@ember/controller";
import { action } from "@ember/object";
import { debounce } from "@ember/runloop";
import { ajax } from "discourse/lib/ajax";
import discourseComputed, { observes } from "discourse-common/utils/decorators";
import { INPUT_DELAY } from "discourse-common/config/environment";

export default Controller.extend({
  router: service(),
  application: controller(),
  loading: false,
  offset: 0,
  filterName: "",
  filter: "",

  @discourseComputed("site.mobileView")
  isDesktop(mobileView) {
    return !mobileView;
  },

  _setFilter(filter) {
    this.set("loading", true);
    this.set("offset", 0);
    this.set("filter", filter);

    const groupName = this.group.name;
    ajax(`/assign/members/${groupName}`, {
      type: "GET",
      data: { filter: this.filter, offset: this.offset }
    })
      .then(result => {
        if (this.router.currentRoute.params.filter !== "everyone") {
          this.transitionToRoute("group.assigned.show", groupName, "everyone");
        }
        this.set("members", result.members);
      })
      .finally(() => {
        this.set("loading", false);
      });
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
      })
        .then(result => {
          this.members.pushObjects(result.members);
        })
        .finally(() => this.set("loading", false));
    }
  },

  @action
  loadMore() {
    this.findMembers();
  },

  @action
  onChangeFilterName(value) {
    debounce(this, this._setFilter, value, INPUT_DELAY * 2);
  }
});
