import { inject as service } from "@ember/service";
import Controller, { inject as controller } from "@ember/controller";
import { ajax } from "discourse/lib/ajax";

export default Controller.extend({
  router: service(),
  application: controller(),
  loading: false,
  offset: 0,

  findMembers(refresh) {
    if(refresh){
      this.set("members", this.model.members);
      return;
    }

    if (this.loading || !this.model) {
      return;
    }

    if (this.model.members.length >= this.offset + 50) {
      this.set("loading", true);
      this.set("offset", this.offset + 50);
      ajax(`/assign/members/${this.groupName}?offset=${this.offset}`).then(
        result => {
          this.set("members", this.members.concat(result.members));
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
