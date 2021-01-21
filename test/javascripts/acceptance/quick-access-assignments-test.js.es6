import { acceptance, updateCurrentUser, queryAll } from "discourse/tests/helpers/qunit-helpers";
import { default as AssignedTopics } from "../fixtures/assigned-topics-fixtures";

const USER_MENU = "#current-user.header-dropdown-toggle";

acceptance("Quick access assignments panel", function (needs) {
  needs.user();
  needs.settings({ assign_enabled: true, assigns_user_url_path: "/"});

  needs.pretender((server, helper) => {
    const messagesPath = "/topics/messages-assigned/eviltrout.json";
    const assigns = AssignedTopics[messagesPath];
    server.get(messagesPath, () => helper.response(assigns));
  });

  test("Quick access assignments panel", async (assert) => {
    updateCurrentUser({ can_assign: true });

    await visit("/");
    await click(USER_MENU);

    // TODO: Remove when 2.7 gets released
    let quickAccessAssignmentsTab = ".widget-button.assigned";

    if (queryAll(quickAccessAssignmentsTab).length == 0) {
      quickAccessAssignmentsTab = ".widget-link.assigned";
    }

    await click(quickAccessAssignmentsTab);
    const assignment = find(".quick-access-panel li a")[0];

    assert.ok(assignment.innerText.includes("Greetings!"));
    assert.ok(assignment.href.includes("/t/greetings/10/5"));

    await click(quickAccessAssignmentsTab);
    assert.equal(
      currentPath(),
      "user.userActivity.assigned",
      "a second click should redirect to the full assignments page"
    );
  });
});
