import { acceptance, updateCurrentUser } from "helpers/qunit-helpers";
import { default as AssignedTopics } from "../fixtures/assigned-topics-fixtures";

const USER_MENU = "#current-user.header-dropdown-toggle";
const QUICK_ACCESS_ASSIGNMENTS_TAB = ".widget-link.assigned";

acceptance("Quick access assignments panel", {
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

test("Quick access assignments panel", async assert => {
  updateCurrentUser({ can_assign: true });

  await visit("/");
  await click(USER_MENU);

  await click(QUICK_ACCESS_ASSIGNMENTS_TAB);
  const assignment = find(".quick-access-panel li a")[0];

  assert.ok(assignment.innerText.includes("Greetings!"));
  assert.ok(assignment.href.includes("/t/greetings/10/5"));

  await click(QUICK_ACCESS_ASSIGNMENTS_TAB);
  assert.equal(
    currentPath(),
    "user.userActivity.assigned",
    "a second click should redirect to the full assignments page"
  );
});
