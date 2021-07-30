import selectKit from "discourse/tests/helpers/select-kit-helper";
import {
  acceptance,
  exists,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { click, visit } from "@ember/test-helpers";
import { clearTopicFooterButtons } from "discourse/lib/register-topic-footer-button";
import { test } from "qunit";

acceptance("Discourse Assign | Assign mobile", function (needs) {
  needs.user();
  needs.mobileView();
  needs.settings({ assign_enabled: true });
  needs.hooks.beforeEach(() => clearTopicFooterButtons());

  needs.pretender((server, helper) => {
    server.get("/assign/suggestions", () => {
      return helper.response({
        success: true,
        assign_allowed_groups: false,
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

    server.put("/assign/assign", () => {
      return helper.response({ success: true });
    });
  });

  test("Footer dropdown contains button", async (assert) => {
    updateCurrentUser({ can_assign: true });
    await visit("/t/internationalization-localization/280");
    const menu = selectKit(".topic-footer-mobile-dropdown");
    await menu.expand();

    assert.ok(menu.rowByValue("assign").exists());
    await menu.selectRowByValue("assign");
    assert.ok(exists(".assign.modal-body"), "assign modal opens");

    await click(".assign-suggestions .avatar");
  });
});

acceptance("Discourse Assign | Assign desktop", function (needs) {
  needs.user();
  needs.settings({ assign_enabled: true });
  needs.hooks.beforeEach(() => clearTopicFooterButtons());

  needs.pretender((server, helper) => {
    server.get("/assign/suggestions", () => {
      return helper.response({
        success: true,
        assign_allowed_groups: false,
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

    server.put("/assign/assign", () => {
      return helper.response({ success: true });
    });
  });

  test("Footer dropdown contains button", async (assert) => {
    updateCurrentUser({ can_assign: true });
    await visit("/t/internationalization-localization/280");
    await click("#topic-footer-button-assign");

    assert.ok(exists(".assign.modal-body"), "assign modal opens");

    await click(".assign-suggestions .avatar");
  });
});
