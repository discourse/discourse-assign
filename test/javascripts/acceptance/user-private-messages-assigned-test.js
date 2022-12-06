import I18n from "I18n";
import {
  acceptance,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { click, currentURL, visit } from "@ember/test-helpers";
import AssignedTopics from "../fixtures/assigned-topics-fixtures";
import { cloneJSON } from "discourse-common/lib/object";
import selectKit from "discourse/tests/helpers/select-kit-helper";
import { test } from "qunit";

acceptance("User Private Messages | Discourse Assign", function (needs) {
  needs.user({
    can_assign: true,
  });

  needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });

  needs.pretender((server, helper) => {
    const assignments = cloneJSON(
      AssignedTopics["/topics/messages-assigned/eviltrout.json"]
    );

    server.get("/topics/private-messages-assigned/eviltrout.json", () =>
      helper.response(assignments)
    );
  });

  test("viewing assigned messages", async function (assert) {
    await visit("/u/eviltrout/messages");
    await click(".assigned-messages a");

    assert.strictEqual(
      currentURL(),
      "/u/eviltrout/messages/assigned",
      "transitioned to the assigned page"
    );
  });

  test("viewing assigned messages when redesigned user page nav has been enabled", async function (assert) {
    updateCurrentUser({ redesigned_user_page_nav_enabled: true });

    await visit("/u/eviltrout/messages");

    const messagesDropdown = selectKit(".user-nav-messages-dropdown");

    await messagesDropdown.expand();
    await messagesDropdown.selectRowByName(I18n.t("discourse_assign.assigned"));

    assert.strictEqual(
      currentURL(),
      "/u/eviltrout/messages/assigned",
      "transitioned to the assigned page"
    );

    assert.strictEqual(
      messagesDropdown.header().name(),
      I18n.t("discourse_assign.assigned"),
      "assigned messages is selected in the dropdown"
    );
  });
});
