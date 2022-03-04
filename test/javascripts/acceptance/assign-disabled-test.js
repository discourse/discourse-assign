import selectKit from "discourse/tests/helpers/select-kit-helper";
import {
  acceptance,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { visit } from "@ember/test-helpers";
import { clearTopicFooterButtons } from "discourse/lib/register-topic-footer-button";
import { test } from "qunit";

acceptance("Discourse Assign | Assign disabled mobile", function (needs) {
  needs.user();
  needs.mobileView();
  needs.settings({ assign_enabled: false });
  needs.hooks.beforeEach(() => clearTopicFooterButtons());

  test("Footer dropdown does not contain button", async (assert) => {
    updateCurrentUser({ can_assign: true });
    const menu = selectKit(".topic-footer-mobile-dropdown");

    await visit("/t/internationalization-localization/280");
    await menu.expand();

    assert.notOk(menu.rowByValue("assign").exists());
  });
});
