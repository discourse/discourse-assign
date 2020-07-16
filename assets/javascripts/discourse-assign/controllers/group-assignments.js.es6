import { inject as service } from "@ember/service";
import Controller, { inject as controller } from "@ember/controller";

export default Controller.extend({
  router: service(),
  application: controller(),
  loading: false,
  queryParams: ["offset"],
  offset: 0,

  findMembers() {
    if (this.loading || !this.model) {
      return;
    }

    if(this.model.members.length >= this.offset + 50){
      this.set("loading", true);
      this.set("offset", this.offset + 50);
      this.set("application.showFooter", false);
    }else{
      this.set("application.showFooter", true);
    }
  },

  actions: {
    loadMore: function() {
      this.findMembers();
    }
  }
});
