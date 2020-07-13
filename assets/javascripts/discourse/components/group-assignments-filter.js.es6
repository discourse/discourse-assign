import Component from "@ember/component";

export default Component.extend({
  tagName: "li",
  displayName: "",

  init(){
    if(this.siteSettings.prioritize_username_in_ux){
      this.set("displayName",this.filter.username);
    }else{
      this.set("displayName",this.filter.displayName);
    }
    this._super(...arguments);
  }
});
