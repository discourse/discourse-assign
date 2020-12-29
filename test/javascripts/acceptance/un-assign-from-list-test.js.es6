import selectKit from "discourse/tests/helpers/select-kit-helper";
import { acceptance } from "discourse/tests/helpers/qunit-helpers";
import { default as AssignedTopics } from "../fixtures/assigned-topics-fixtures";

acceptance("UnAssign/Re-assign from the topics list", function (needs) {
  needs.user();
  needs.settings({ assign_enabled: true, assigns_user_url_path: "/"});
  needs.pretender((server, helper) => {
    const messagesPath = "/topics/messages-assigned/eviltrout.json";
    const assigns = AssignedTopics[messagesPath];
    server.get(messagesPath, () => helper.response(assigns));
  });

  test("Unassing/Re-assign options are visible", async (assert) => {
    const options = selectKit(".assign-actions-dropdown");

    await visit("/u/eviltrout/activity/assigned");
    await options.expand();

    assert.equal(find("li[data-value='unassign']").length, 1);
    assert.equal(find("li[data-value='reassign']").length, 1);
  });
});
