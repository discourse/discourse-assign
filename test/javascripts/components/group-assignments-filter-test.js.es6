import componentTest from "helpers/component-test";
import { inject as service } from "@ember/service";

moduleForComponent("group-assignments-filter", { integration: true });

componentTest("display username", {
  template: '{{group-assignments-filter show-avatar=true filter=member routeType=route_type}}',

  beforeEach() {
    this.siteSettings.prioritize_username_in_ux = true;
    this.set("routeType", service(),);
    this.set("filter", {
      id: 2,
      username: "Ahmed",
      displayName: "Ahmed Gagan",
      name:"Ahmed Gagan",
      avatar_template:"/letter_avatar_proxy/v4/letter/a/8c91f0/{size}.png",
      title:"trust_level_0",
      last_posted_at:"2020-06-22T10:15:54.532Z",
      last_seen_at:"2020-07-07T11:55:59.437Z",
      added_at:"2020-06-22T09:55:31.692Z",
      timezone:"Asia/Calcutta"
    });
  },
  async test(assert) {
    assert.equal(this.displayName, 'Ahmed');
  }
});
componentTest("display name", {
  template: '{{group-assignments-filter show-avatar=true filter=member routeType=route_type}}',

  beforeEach() {
    this.siteSettings.prioritize_username_in_ux = true;
    this.set("router", service(),);
    this.set("member", {
      id: 2,
      username: "Ahmed",
      displayName:"Ahmed Gagan",
      name:"Ahmed Gagan",
      avatar_template:"/letter_avatar_proxy/v4/letter/a/8c91f0/{size}.png",
      title:"trust_level_0",
      last_posted_at:"2020-06-22T10:15:54.532Z",
      last_seen_at:"2020-07-07T11:55:59.437Z",
      added_at:"2020-06-22T09:55:31.692Z",
      timezone:"Asia/Calcutta"
    });
  },
  async test(assert) {
    assert.equal(this.displayName, 'Ahmed Gagan');
  }
});