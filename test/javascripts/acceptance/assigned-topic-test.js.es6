import { test } from "qunit";
import {
  acceptance,
  exists,
  query,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { visit } from "@ember/test-helpers";
import { cloneJSON } from "discourse-common/lib/object";
import topicFixtures from "discourse/tests/fixtures/topic";

acceptance("Discourse Assign | Assigned topic", function (needs) {
  needs.user();
  needs.settings({
    assign_enabled: true,
    tagging_enabled: true,
    assigns_user_url_path: "/",
  });

  needs.pretender((server, helper) => {
    server.get("/t/44.json", () => {
      let topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
      topic["assigned_to_user"] = {
        username: "eviltrout",
        name: "Robin Ward",
        avatar_template:
          "/letter_avatar/eviltrout/{size}/3_f9720745f5ce6dfc2b5641fca999d934.png",
        assigned_at: "2021-06-13T16:33:14.189Z",
      };
      return helper.response(topic);
    });

    server.get("/t/45.json", () => {
      let topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
      topic["assigned_to_group"] = {
        name: "Developers",
        assigned_at: "2021-06-13T16:33:14.189Z",
      };
      return helper.response(topic);
    });
  });

  test("Shows user assignment info", async (assert) => {
    updateCurrentUser({ can_assign: true });
    await visit("/t/assignment-topic/44");

    assert.equal(
      query("#topic-title .assigned-to").innerText.trim(),
      "eviltrout",
      "shows assignment in the header"
    );
    assert.equal(
      query("#post_1 .assigned-to-username").innerText.trim(),
      "eviltrout",
      "shows assignment in the first post"
    );
    assert.ok(exists("#post_1 .assigned-to svg.d-icon-user-plus"));
    assert.ok(
      exists("#topic-footer-button-assign .unassign-label"),
      "shows unassign button at the bottom of the topic"
    );
  });

  test("Shows group assignment info", async (assert) => {
    updateCurrentUser({ can_assign: true });
    await visit("/t/assignment-topic/45");

    assert.equal(
      query("#topic-title .assigned-to").innerText.trim(),
      "Developers",
      "shows assignment in the header"
    );
    assert.equal(
      query("#post_1 .assigned-to-username").innerText.trim(),
      "Developers",
      "shows assignment in the first post"
    );
    assert.ok(exists("#post_1 .assigned-to svg.d-icon-group-plus"));
    assert.ok(
      exists("#topic-footer-button-assign .unassign-label"),
      "shows unassign button at the bottom of the topic"
    );
  });
});
