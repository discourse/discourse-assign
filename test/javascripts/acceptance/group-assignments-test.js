import { acceptance, count } from "discourse/tests/helpers/qunit-helpers";
import { visit } from "@ember/test-helpers";
import AssignedTopics from "../fixtures/assigned-group-assignments-fixtures";
import GroupMembers from "../fixtures/group-members-fixtures";
import { test } from "qunit";

acceptance("Discourse Assign | GroupAssignments", function (needs) {
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

  test("Group Assignments Everyone", async function (assert) {
    await visit("/g/discourse/assigned");
    assert.strictEqual(count(".topic-list-item"), 1);
  });

  test("Group Assignments Ahmedgagan", async function (assert) {
    await visit("/g/discourse/assigned/ahmedgagan6");
    assert.strictEqual(count(".topic-list-item"), 1);
  });
});
