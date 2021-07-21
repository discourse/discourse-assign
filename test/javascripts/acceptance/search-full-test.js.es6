import selectKit from "discourse/tests/helpers/select-kit-helper";
import {
  acceptance,
  updateCurrentUser,
  waitFor,
} from "discourse/tests/helpers/qunit-helpers";
import { skip, test } from "qunit";

acceptance("Search - Full Page", function (needs) {
  needs.settings({ assign_enabled: true });
  needs.user();

  test("update in:assigned filter through advanced search ui", async (assert) => {
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
      'has updated search term to "none in:assigned"'
    );
  });

  test("update in:unassigned filter through advanced search ui", async (assert) => {
    updateCurrentUser({ can_assign: true });
    const inSelector = selectKit(".search-advanced-options .select-kit#in");

    await visit("/search");

    await fillIn(".search-query", "none");
    await inSelector.expand();
    await inSelector.selectRowByValue("unassigned");
    assert.equal(
      inSelector.header().label(),
      "are unassigned",
      'has "are unassigned" populated'
    );
    assert.equal(
      find(".search-query").val(),
      "none in:unassigned",
      'has updated search term to "none in:unassigned"'
    );
  });

  skip("update assigned to through advanced search ui", async (assert) => {
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
});
