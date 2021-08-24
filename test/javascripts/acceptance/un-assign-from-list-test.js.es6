import selectKit from "discourse/tests/helpers/select-kit-helper";
import {
  acceptance,
  count,
  query,
} from "discourse/tests/helpers/qunit-helpers";
import { visit } from "@ember/test-helpers";
import AssignedTopics from "../fixtures/assigned-topics-fixtures";
import { test } from "qunit";

acceptance(
  "Discourse Assign | UnAssign/Re-assign from the topics list for user assigment",
  function (needs) {
    needs.user();
    needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });
    needs.pretender((server, helper) => {
      const messagesPath = "/topics/messages-assigned/eviltrout.json";
      const assigns = AssignedTopics[messagesPath];
      server.get(messagesPath, () => helper.response(assigns));
    });

    test("Unassign/Re-assign options are visible", async (assert) => {
      const options = selectKit(
        "[data-topic-id='10'] .assign-actions-dropdown"
      );

      await visit("/u/eviltrout/activity/assigned");
      await options.expand();

      assert.equal(count("li[data-value='unassign']"), 1);
      assert.equal(count("li[data-value='reassign']"), 1);
      assert.equal(
        query("li[data-value='unassign'] .desc").innerText,
        "Unassign eviltrout from Topic",
        "show unassign from user"
      );
    });
  }
);

acceptance(
  "Discourse Assign | UnAssign/Re-assign from the topics list for group assigment",
  function (needs) {
    needs.user();
    needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });
    needs.pretender((server, helper) => {
      const messagesPath = "/topics/messages-assigned/eviltrout.json";
      const assigns = AssignedTopics[messagesPath];
      server.get(messagesPath, () => helper.response(assigns));
    });

    test("Unassign/Re-assign options are visible", async (assert) => {
      const options = selectKit(
        "[data-topic-id='11'] .assign-actions-dropdown"
      );

      await visit("/u/eviltrout/activity/assigned");
      await options.expand();

      assert.equal(count("li[data-value='unassign']"), 1);
      assert.equal(count("li[data-value='reassign']"), 1);
      assert.equal(
        query("li[data-value='unassign'] .desc").innerText,
        "Unassign Developers from Topic",
        "show unassign from group"
      );
    });
  }
);
