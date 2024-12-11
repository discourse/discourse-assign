import { click, visit } from "@ember/test-helpers";
import { test } from "qunit";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";

acceptance("Discourse Assign | Assign disabled mobile", function (needs) {
  needs.user({ can_assign: true });
  needs.mobileView();
  needs.settings({ assign_enabled: false });

  test("Footer dropdown does not contain button", async function (assert) {
    await visit("/t/internationalization-localization/280");
    await click(".topic-footer-mobile-dropdown-trigger");
    assert.dom(".assign").doesNotExist();
  });
});
