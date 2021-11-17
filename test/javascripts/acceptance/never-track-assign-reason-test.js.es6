import { test } from "qunit";
import {
  acceptance,
  query,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { visit } from "@ember/test-helpers";
import { cloneJSON } from "discourse-common/lib/object";
import topicFixtures from "discourse/tests/fixtures/topic";

acceptance(
  "Discourse Assign | Never track topics assign reason",
  function (needs) {
    needs.user();
    needs.settings({
      assign_enabled: true,
      assigns_user_url_path: "/",
    });

    needs.pretender((server, helper) => {
      server.get("/t/44.json", () => {
        let topic = cloneJSON(topicFixtures["/t/130.json"]);
        topic.details.notifications_reason_id = 3;
        return helper.response(topic);
      });
      server.get("/t/45.json", () => {
        let topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
        topic["assigned_to_user"] = {
          username: "eviltrout",
          name: "Robin Ward",
          avatar_template:
            "/letter_avatar/eviltrout/{size}/3_f9720745f5ce6dfc2b5641fca999d934.png",
        };
        return helper.response(topic);
      });
      server.get("/t/46.json", () => {
        let topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
        topic["assigned_to_group"] = {
          id: 47,
          name: "discourse",
        };
        return helper.response(topic);
      });
    });

    test("Show default assign reason when user tracks topics", async (assert) => {
      updateCurrentUser({ auto_track_topics_after_msecs: 1 });

      await visit("/t/assignment-topic/44");

      assert.strictEqual(
        query(".topic-notifications-button .reason span.text").innerText,
        "You will receive notifications because you are watching this topic."
      );
    });

    test("Show user assign reason when user never tracks topics", async (assert) => {
      updateCurrentUser({
        auto_track_topics_after_msecs: -1,
      });

      await visit("/t/assignment-topic/45");

      assert.strictEqual(
        query(".topic-notifications-button .reason span.text").innerText,
        "You will see a count of new replies because this topic was assigned to you."
      );
    });
  }
);
