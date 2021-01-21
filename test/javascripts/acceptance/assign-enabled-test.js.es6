import selectKit from "discourse/tests/helpers/select-kit-helper";
import {
  acceptance,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { clearTopicFooterButtons } from "discourse/lib/register-topic-footer-button";

acceptance("Assign mobile", function (needs) {
  needs.user();
  needs.mobileView();
  needs.settings({ assign_enabled: true });
  needs.hooks.beforeEach(() => clearTopicFooterButtons());

  test("Footer dropdown contains button", async (assert) => {
    updateCurrentUser({ can_assign: true });
    const menu = selectKit(".topic-footer-mobile-dropdown");

    await visit("/t/internationalization-localization/280");
    await menu.expand();

    assert.ok(menu.rowByValue("assign").exists());
  });
});
