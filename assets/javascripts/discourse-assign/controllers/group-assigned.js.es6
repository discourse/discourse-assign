import { inject as service } from "@ember/service";
import Controller, { inject as controller } from "@ember/controller";
import { action } from "@ember/object";
import { debounce } from "@ember/runloop";
import { ajax } from "discourse/lib/ajax";
import discourseComputed from "discourse-common/utils/decorators";
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

  @action
  loadMore() {
    this.findMembers();
  },

  // we try to remove observers as much as possible, also look at assigned.hbs to see what I did here
  @action
  onChangeFilterName(value) {
    // we have a global for INPUT_DELAY, feel free to use more, you could also do
    // INPUT_DELAY * 2 if you feel that's necessary
    // note that any debounce couldn't end up happening after the lifecycle of your object
    // eg do something with x in 2 seconds..... x.doSomething()... problem is... x doesn't exist anymore
    // this might be ok here, but it's something to keep in mind
    debounce(this, this._setFilter, value, INPUT_DELAY);
  },

  _setFilter(filter) {
    this.set("loading", true);
    this.set("offset", 0);
    this.set("filter", filter);

    const groupName = this.group.name;

    // I generally try to always return the prommise if there's one
    return ajax(`/assign/members/${groupName}`, {
      type: "GET",
      data: { filter: this.filter, offset: this.offset }
    })
      .then(result => {
        // know that this is risky, and a bug actually in your code
        // if you type something in filter and click fast on logo befire the end of debouncing
        // you will load home and then reload group.assigned.show
        if (this.router.currentRoute.params.filter !== "everyone") {
          // before this change, this would actuallu make an error as name wasn't provided
          this.transitionToRoute("group.assigned.show", groupName, "everyone");
        }

        this.set("members", result.members);
      })
      .finally(() => {
        // by doing it in finally we ensure that an error won't prevent loading to be cancelled
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

      // I generally try to always return the prommise if there's one
      return ajax(`/assign/members/${this.group.name}`, {
        type: "GET",
        data: { filter: this.filter, offset: this.offset }
      })
        .then(result => {
          this.members.pushObjects(result.members);
        })
        .finally(() => this.set("loading", false));
    }
  }
});
