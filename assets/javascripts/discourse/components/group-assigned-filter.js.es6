import discourseComputed from "discourse-common/utils/decorators";
import Component from "@ember/component";

export default Component.extend({
  tagName: "li",

  @discourseComputed(
    "siteSettings.prioritize_username_in_ux",
    "filter.username",
    "filter.name"
  )
  displayName(prioritize_username_in_ux, username, name) {
    if (prioritize_username_in_ux) {
      return username.trim();
    }
    return (name || username).trim();
  }
});
