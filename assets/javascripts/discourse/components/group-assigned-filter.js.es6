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
  }
});
