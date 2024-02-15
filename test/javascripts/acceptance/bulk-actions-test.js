import { click, fillIn, visit } from "@ember/test-helpers";
import { test } from "qunit";
import pretender, {
  parsePostData,
  response,
} from "discourse/tests/helpers/create-pretender";
import { acceptance, query } from "discourse/tests/helpers/qunit-helpers";
import selectKit from "discourse/tests/helpers/select-kit-helper";
import I18n from "I18n";

acceptance("Discourse Assign | Bulk actions", function (needs) {
  needs.user({
    moderator: true,
    can_assign: true,
  });
  needs.settings({
    assign_enabled: true,
    enable_assign_status: true,
  });

  needs.pretender((server, helper) => {
    server.get("/assign/suggestions", () => {
      return helper.response({
        success: true,
        assign_allowed_groups: false,
        assign_allowed_for_groups: [],
        suggestions: [
          {
            id: 19,
            username: "eviltrout",
            name: "Robin Ward",
            avatar_template:
              "/user_avatar/meta.discourse.org/eviltrout/{size}/5275_2.png",
          },
        ],
      });
    });
  });

  test("Assigning users to topics", async function (assert) {
    pretender.put("/topics/bulk", ({ requestBody }) => {
      const body = parsePostData(requestBody);
      assert.deepEqual(body.operation, {
        type: "assign",
        username: "eviltrout",
        status: "In Progress",
        note: "a note!",
      });
      assert.deepEqual(body["topic_ids[]"], [
        topic1.dataset.topicId,
        topic2.dataset.topicId,
      ]);

      return response({ success: true });
    });

    await visit("/latest");
    await click("button.bulk-select");

    const topic1 = query(".topic-list-body tr:nth-child(1)");
    const topic2 = query(".topic-list-body tr:nth-child(2)");
    await click(topic1.querySelector("input.bulk-select"));
    await click(topic2.querySelector("input.bulk-select"));

    await click(".bulk-select-actions");

    assert
      .dom("#discourse-modal-title")
      .includesText(I18n.t("topics.bulk.actions"), "opens bulk-select modal");

    await click("button.assign-topics");

    const menu = selectKit(".topic-bulk-actions-modal .user-chooser");
    assert.true(menu.isExpanded(), "user selector is expanded");

    await click(".topic-bulk-actions-modal .btn-primary");
    assert.dom(".error-label").includesText("Choose a user to assign");

    await menu.expand();
    await menu.selectRowByIndex(0);
    assert.strictEqual(menu.header().value(), "eviltrout");

    await fillIn("#assign-modal-note", "a note!");

    const statusDropdown = selectKit("#assign-status");
    assert.strictEqual(statusDropdown.header().value(), "New");

    await statusDropdown.expand();
    await statusDropdown.selectRowByValue("In Progress");
    assert.strictEqual(statusDropdown.header().value(), "In Progress");

    await click(".topic-bulk-actions-modal .btn-primary");
  });
});
