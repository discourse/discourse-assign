import { acceptance } from "helpers/qunit-helpers";
import { default as AssignedTopics } from "../fixtures/assigned-group-assignments-fixtures";

acceptance("GroupAssignments", {
  loggedIn: true,
  settings: { assign_enabled: true, assigns_user_url_path: "/" },
  pretend(server, helper) {
    const groupPath = "/topics/group-topics-assigned/discourse.json";
    const memberPath = "/topics/messages-assigned/awesomerobot.json";
    const groupAssigns = AssignedTopics[groupPath];
    const memberAssigns = AssignedTopics[memberPath];
    server.get(groupPath, () => helper.response(groupAssigns));
    server.get(memberPath, () => helper.response(memberAssigns));
  }
});
QUnit.skip("Group Assignments Everyone", async assert => {
  await visit("/g/discourse/assignments");
  assert.equal(currentPath(), "group.assignments.show");
  assert.ok(find(".topic-list-item").length === 1);
});

QUnit.skip("Group Assignments Awesomerobot", async assert => {
  await visit("/g/discourse/assignments/awesomerobot");
  assert.equal(currentPath(), "group.assignments.show");
  assert.ok(find(".topic-list-item").length === 1);
});
