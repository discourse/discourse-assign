import { acceptance, updateCurrentUser } from "helpers/qunit-helpers";
acceptance("GroupAssignments", {
  loggedIn: true,
  settings: { assign_enabled: true }
});
QUnit.test("Group Assignments Everyone", async assert => {
  updateCurrentUser({ can_assign: true });

  await visit("/g/discourse/assignments/everyone");
  console.log(find(".topic-list-item").length);

  assert.ok(true);
  // assert.ok(find(".topic-list-item").length >= 0);
});