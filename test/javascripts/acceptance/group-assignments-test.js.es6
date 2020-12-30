import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as AssignedTopics } from "../fixtures/assigned-group-assignments-fixtures";
import { default as GroupMembers } from "../fixtures/group-members-fixtures";

acceptance("GroupAssignments", function (needs) {
  needs.user();
  needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });
  needs.pretender((server, helper) => {
    const groupPath = "/topics/group-topics-assigned/discourse.json";
    const memberPath = "/topics/messages-assigned/ahmedgagan6.json";
    const getMembersPath = "/assign/members/discourse";
    const groupAssigns = AssignedTopics[groupPath];
    const memberAssigns = AssignedTopics[memberPath];
    const getMembers = GroupMembers[getMembersPath];
    server.get(groupPath, () => helper.response(groupAssigns));
    server.get(memberPath, () => helper.response(memberAssigns));
    server.get(getMembersPath, () => helper.response(getMembers));
  });

  test("Group Assignments Everyone", async (assert) => {
    await visit("/g/discourse/assigned");
    assert.equal(currentPath(), "group.assigned.show");
    assert.ok(find(".topic-list-item").length === 1);
  });

  test("Group Assignments Ahmedgagan", async (assert) => {
    await visit("/g/discourse/assigned/ahmedgagan6");
    assert.equal(currentPath(), "group.assigned.show");
    assert.ok(find(".topic-list-item").length === 1);
  });
});
