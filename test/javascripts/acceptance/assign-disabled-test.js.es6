import selectKit from "helpers/select-kit-helper";
import { acceptance, updateCurrentUser } from "helpers/qunit-helpers";
import { clearCallbacks } from "select-kit/mixins/plugin-api";

acceptance("Assign disabled mobile", {
  loggedIn: true,
  mobileView: true,
  settings: { assign_enabled: false },
  beforeEach() {
    clearCallbacks();
  }
});

QUnit.test("Footer dropdown does not contain button", async assert => {
  updateCurrentUser({ can_assign: true });
  const menu = selectKit(".topic-footer-mobile-dropdown");

  await visit("/t/internationalization-localization/280");
  await menu.expand();

  assert.notOk(menu.rowByValue("assign").exists());
});
