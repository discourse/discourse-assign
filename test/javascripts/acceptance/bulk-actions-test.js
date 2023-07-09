import { acceptance, query } from "discourse/tests/helpers/qunit-helpers";
import { test } from "qunit";
import { click, fillIn, visit } from "@ember/test-helpers";
import selectKit from "discourse/tests/helpers/select-kit-helper";
import pretender, {
  parsePostData,
  response,
} from "discourse/tests/helpers/create-pretender";
import I18n from "I18n";

acceptance("Discourse Assign | Bulk actions", function (needs) {
  needs.user({
    moderator: true,
    can_assign: true,
  });
  needs.settings({ assign_enabled: true });

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

    await menu.selectRowByIndex(0);
    assert.strictEqual(menu.header().value(), "eviltrout");

    pretender.put("/topics/bulk", ({ requestBody }) => {
      const body = parsePostData(requestBody);
      assert.deepEqual(body.operation, {
        type: "assign",
        username: "eviltrout",
        note: "a note!",
      });
      assert.deepEqual(body["topic_ids[]"], [
        topic1.dataset.topicId,
        topic2.dataset.topicId,
      ]);

      return response({ success: true });
    });

    await fillIn("#assign-modal-note", "a note!");
    await click(".topic-bulk-actions-modal .btn-primary");
  });
});
