import selectKit from "helpers/select-kit-helper";
import { acceptance, waitFor, updateCurrentUser } from "helpers/qunit-helpers";

acceptance("Search - Full Page", {
  settings: { assign_enabled: true },
  loggedIn: true
});
QUnit.test(
  "update in:assigned filter through advanced search ui",
  async assert => {
    updateCurrentUser({ can_assign: true });
    const inSelector = selectKit(".search-advanced-options .select-kit#in");

    await visit("/search");

    await fillIn(".search-query", "none");
    await inSelector.expand();
    await inSelector.selectRowByValue("assigned");
    assert.equal(
      inSelector.header().label(),
      "are assigned",
      'has "are assigned" populated'
    );
    assert.equal(
      find(".search-query").val(),
      "none in:assigned",
      'has updated search term to "none in:assinged"'
    );
  }
);

QUnit.test(
  "update in:not_assigned filter through advanced search ui",
  async assert => {
    updateCurrentUser({ can_assign: true });
    const inSelector = selectKit(".search-advanced-options .select-kit#in");

    await visit("/search");

    await fillIn(".search-query", "none");
    await inSelector.expand();
    await inSelector.selectRowByValue("not_assigned");
    assert.equal(
      inSelector.header().label(),
      "are not assigned",
      'has "are not assigned" populated'
    );
    assert.equal(
      find(".search-query").val(),
      "none in:not_assigned",
      'has updated search term to "none in:not_assinged"'
    );
  }
);

QUnit.skip("update assigned to through advanced search ui", async assert => {
  updateCurrentUser({ can_assign: true });
  await visit("/search");
  await fillIn(".search-query", "none");
  await fillIn(".search-advanced-options .user-selector-assigned", "admin");
  await click(".search-advanced-options .user-selector-assigned");
  await keyEvent(
    ".search-advanced-options .user-selector-assigned",
    "keydown",
    8
  );
  waitFor(assert, async () => {
    assert.ok(
      visible(".search-advanced-options .autocomplete"),
      '"autocomplete" popup is visible'
    );
    assert.ok(
      exists(
        '.search-advanced-options .autocomplete ul li a span.username:contains("admin")'
      ),
      '"autocomplete" popup has an entry for "admin"'
    );

    await click(".search-advanced-options .autocomplete ul li a:first");

    assert.ok(
      exists('.search-advanced-options span:contains("admin")'),
      'has "admin" pre-populated'
    );
    assert.equal(
      find(".search-query").val(),
      "none assigned:admin",
      'has updated search term to "none assigned:admin"'
    );
  });
});
