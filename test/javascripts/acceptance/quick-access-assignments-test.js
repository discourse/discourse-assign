import {
  acceptance,
  query,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { click, currentURL, visit } from "@ember/test-helpers";
import AssignedTopics from "../fixtures/assigned-topics-fixtures";
import { test } from "qunit";

acceptance(
  "Discourse Assign | Quick access assignments panel",
  function (needs) {
    needs.user();
    needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });

    needs.pretender((server, helper) => {
      const messagesPath = "/topics/messages-assigned/eviltrout.json";
      const assigns = AssignedTopics[messagesPath];
      server.get(messagesPath, () => helper.response(assigns));
    });

    test("Quick access assignments panel", async function (assert) {
      updateCurrentUser({ can_assign: true });

      await visit("/");
      await click("#current-user.header-dropdown-toggle");

      await click(".widget-button.assigned");
      const assignment = query(".quick-access-panel li a");

      assert.ok(assignment.innerText.includes("Greetings!"));
      assert.ok(assignment.href.includes("/t/greetings/10/5"));

      await click(".widget-button.assigned");
      assert.strictEqual(
        currentURL(),
        "/u/eviltrout/activity/assigned",
        "a second click should redirect to the full assignments page"
      );
    });
  }
);
