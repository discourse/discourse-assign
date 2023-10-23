import { visit } from "@ember/test-helpers";
import { test } from "qunit";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import selectKit from "discourse/tests/helpers/select-kit-helper";

acceptance("Discourse Assign | Assign disabled mobile", function (needs) {
  needs.user({ can_assign: true });
  needs.mobileView();
  needs.settings({ assign_enabled: false });

  test("Footer dropdown does not contain button", async function (assert) {
    await visit("/t/internationalization-localization/280");

    const menu = selectKit(".topic-footer-mobile-dropdown");
    await menu.expand();

    assert.false(menu.rowByValue("assign").exists());
  });
});
