import selectKit from "discourse/tests/helpers/select-kit-helper";
import {
  acceptance,
  query,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { fillIn, visit } from "@ember/test-helpers";
import { test } from "qunit";

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
      query(".search-query").value,
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
      query(".search-query").value,
      "none in:unassigned",
      'has updated search term to "none in:unassigned"'
    );
  });

  test("update assigned to through advanced search ui", async (assert) => {
    updateCurrentUser({ can_assign: true });
    const assignedField = selectKit(".assigned-advanced-search .select-kit");

    await visit("/search");

    await fillIn(".search-query", "none");
    await assignedField.expand();
    await assignedField.fillInFilter("admin");
    await assignedField.selectRowByValue("admin");

    assert.equal(
      assignedField.header().value(),
      "admin",
      'has "admin" filled in'
    );
    assert.equal(
      query(".search-query").value,
      "none assigned:admin",
      'has updated search term to "none assigned:admin"'
    );
  });
});
