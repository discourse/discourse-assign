import componentTest, {
  setupRenderingTest,
} from "discourse/tests/helpers/component-test";
import { discourseModule, query } from "discourse/tests/helpers/qunit-helpers";
import hbs from "htmlbars-inline-precompile";

discourseModule(
  "Discourse Assign | Integration | Component | group-assigned-filter",
  function (hooks) {
    setupRenderingTest(hooks);

    componentTest("displays username and name", {
      template: hbs`{{group-assigned-filter showAvatar=true filter=filter}}`,

      beforeEach() {
        this.set("filter", {
          id: 2,
          username: "Ahmed",
          name: "Ahmed Gagan",
          avatar_template: "/letter_avatar_proxy/v4/letter/a/8c91f0/{size}.png",
          title: "trust_level_0",
          last_posted_at: "2020-06-22T10:15:54.532Z",
          last_seen_at: "2020-07-07T11:55:59.437Z",
          added_at: "2020-06-22T09:55:31.692Z",
          timezone: "Asia/Calcutta",
        });
      },

      test(assert) {
        assert.equal(query(".assign-username").innerText, "Ahmed");
        assert.equal(query(".assign-name").innerText, "Ahmed Gagan");
      },
    });
  }
);
