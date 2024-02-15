import { currentURL, visit } from "@ember/test-helpers";
import { test } from "qunit";
import {
  acceptance,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import selectKit from "discourse/tests/helpers/select-kit-helper";
import { cloneJSON } from "discourse-common/lib/object";
import I18n from "I18n";
import AssignedTopics from "../fixtures/assigned-topics-fixtures";

acceptance("Discourse Assign | User Private Messages", function (needs) {
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
