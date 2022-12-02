export default {
  resource: "user.userPrivateMessages",
  map() {
    this.route("assigned", { path: "/assigned" }, function () {
      this.route("index", { path: "/" });
    });
  },
};
