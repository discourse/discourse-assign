import { acceptance } from "helpers/qunit-helpers";

acceptance("Assign disabled mobile", {
  loggedIn: true,
  mobileView: true,
  settings: { assign_enabled: false }
});

QUnit.test("Footer dropdown does not contain button", async assert => {
  const menu = selectKit(".topic-footer-mobile-dropdown");

  await visit("/t/internationalization-localization/280");
  await menu.expand();

  assert.notOk(menu.rowByValue("assign").exists());
});
