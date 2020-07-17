import discourseComputed from "discourse-common/utils/decorators";
import Component from "@ember/component";

export default Component.extend({
  tagName: "li",

  @discourseComputed(
    "siteSettings.prioritize_username_in_ux",
    "filter.username",
    "filter.displayName"
  )
  displayName(prioritize_username_in_ux, username, displayName) {
    if (prioritize_username_in_ux) {
      return username;
    }
    return displayName;
  }
});
