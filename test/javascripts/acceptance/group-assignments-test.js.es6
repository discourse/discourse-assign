import { acceptance } from "helpers/qunit-helpers";
import { default as AssignedTopics } from "../fixtures/assigned-group-assignments-fixtures";
import { default as GroupMembers } from "../fixtures/group-members-fixtures";

acceptance("GroupAssignments", {
  loggedIn: true,
  settings: { assign_enabled: true, assigns_user_url_path: "/" },
  pretend(server, helper) {
    const groupPath = "/topics/group-topics-assigned/discourse.json";
    const memberPath = "/topics/messages-assigned/ahmedgagan6.json";
    const getMembersPath = "/assign/members/discourse";
    const groupAssigns = AssignedTopics[groupPath];
    const memberAssigns = AssignedTopics[memberPath];
    const getMembers = GroupMembers[getMembersPath];
    server.get(groupPath, () => helper.response(groupAssigns));
    server.get(memberPath, () => helper.response(memberAssigns));
    server.get(getMembersPath, () => helper.response(getMembers));
  }
});

QUnit.test("Group Assignments Everyone", async assert => {
  await visit("/g/discourse/assigned");
  assert.equal(currentPath(), "group.assigned.show");
  assert.ok(find(".topic-list-item").length === 1);
});

QUnit.test("Group Assignments Ahmedgagan", async assert => {
  await visit("/g/discourse/assigned/ahmedgagan6");
  assert.equal(currentPath(), "group.assigned.show");
  assert.ok(find(".topic-list-item").length === 1);
});
