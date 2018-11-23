import { acceptance } from "helpers/qunit-helpers";

acceptance("Assign mobile", {
  loggedIn: true,
  mobileView: true,
  settings: { assign_enabled: true }
});

QUnit.test("Footer dropdown contains button", async assert => {
  const menu = selectKit(".topic-footer-mobile-dropdown");

  await visit("/t/internationalization-localization/280");
  await menu.expand();

  assert.ok(menu.rowByValue("assign").exists());
});
