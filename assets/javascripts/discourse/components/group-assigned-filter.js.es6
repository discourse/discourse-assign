import discourseComputed from "discourse-common/utils/decorators";
import Component from "@ember/component";

export default Component.extend({
  tagName: "li",

  @discourseComputed("router.currentRoute.queryParams.order")
  order(order) {
    if (order) {
      return order;
    }
    return "";
  },

  @discourseComputed("router.currentRoute.queryParams.ascending")
  ascending(ascending) {
    if (ascending) {
      return ascending;
    }
    return false;
  },

  @discourseComputed("router.currentRoute.queryParams.q")
  q(q) {
    if (q) {
      return q;
    }
    return "";
  },

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
