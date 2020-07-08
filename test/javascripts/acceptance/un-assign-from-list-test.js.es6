import selectKit from "helpers/select-kit-helper";
import { acceptance } from "helpers/qunit-helpers";
import { default as AssignedTopics } from "../fixtures/assigned-topics-fixtures";

acceptance("UnAssign/Re-assign from the topics list", {
  loggedIn: true,
  settings: {
    assign_enabled: true,
    assigns_user_url_path: "/"
  },
  pretend(server, helper) {
    const messagesPath = "/topics/messages-assigned/eviltrout.json";
    const assigns = AssignedTopics[messagesPath];
    server.get(messagesPath, () => helper.response(assigns));
  }
});

QUnit.test("Unassing/Re-assign options are visible", async assert => {
  const options = selectKit(".assign-actions-dropdown");

  await visit("/u/eviltrout/activity/assigned");
  await options.expand();

  assert.equal(find("li[data-value='unassign']").length, 1);
  assert.equal(find("li[data-value='reassign']").length, 1);
});
