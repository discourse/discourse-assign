import I18n from "I18n";
import { click, currentURL, visit } from "@ember/test-helpers";
import { test } from "qunit";
import {
  acceptance,
  exists,
  query,
} from "discourse/tests/helpers/qunit-helpers";
import AssignedTopics from "../fixtures/assigned-topics-fixtures";
import { cloneJSON } from "discourse-common/lib/object";

acceptance(
  "Discourse Assign | Sidebar when user cannot assign",
  function (needs) {
    needs.user({ experimental_sidebar_enabled: true, can_assign: false });

    test("assign sidebar link is hidden", async function (assert) {
      await visit("/");

      assert.ok(
        !exists(".sidebar-section-link-assigned"),
        "it does not display the assign link in sidebar"
      );
    });
  }
);

acceptance("Discourse Assign | Sidebar when user can assign", function (needs) {
  needs.user({ experimental_sidebar_enabled: true, can_assign: true });

  needs.pretender((server, helper) => {
    const messagesPath = "/topics/messages-assigned/eviltrout.json";
    const assigns = AssignedTopics[messagesPath];
    server.get(messagesPath, () => helper.response(cloneJSON(assigns)));
  });

  test("clicking on assign link", async function (assert) {
    await visit("/");

    assert.strictEqual(
      query(".sidebar-section-link-assigned").textContent.trim(),
      I18n.t("sidebar.assigned_link_text"),
      "displays the right text for the link"
    );

    assert.strictEqual(
      query(".sidebar-section-link-assigned").title,
      I18n.t("sidebar.assigned_link_title"),
      "displays the right title for the link"
    );

    await click(".sidebar-section-link-assigned");

    assert.strictEqual(
      currentURL(),
      "/u/eviltrout/activity/assigned",
      "it navigates to the right page"
    );
  });
});
