import discourseComputed from "discourse-common/utils/decorators";
import Component from "@ember/component";

export default Component.extend({
  tagName: "li",

  @discourseComputed("siteSettings.prioritize_username_in_ux")
  displayName(prioritize_username_in_ux){
    if(prioritize_username_in_ux){
      return this.filter.username;
    }
    return this.filter.displayName;
  }
});
