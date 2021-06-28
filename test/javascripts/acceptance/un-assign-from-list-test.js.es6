import selectKit from "discourse/tests/helpers/select-kit-helper";
import { acceptance, count } from "discourse/tests/helpers/qunit-helpers";
import AssignedTopics from "../fixtures/assigned-topics-fixtures";

acceptance("UnAssign/Re-assign from the topics list", function (needs) {
  needs.user();
  needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });
  needs.pretender((server, helper) => {
    const messagesPath = "/topics/messages-assigned/eviltrout.json";
    const assigns = AssignedTopics[messagesPath];
    server.get(messagesPath, () => helper.response(assigns));
  });

  test("Unassing/Re-assign options are visible", async (assert) => {
    const options = selectKit(".assign-actions-dropdown");

    await visit("/u/eviltrout/activity/assigned");
    await options.expand();

    assert.equal(count("li[data-value='unassign']"), 1);
    assert.equal(count("li[data-value='reassign']"), 1);
  });
});
