import selectKit from "discourse/tests/helpers/select-kit-helper";
import {
  acceptance,
  count,
  exists,
} from "discourse/tests/helpers/qunit-helpers";
import { visit } from "@ember/test-helpers";
import AssignedTopics from "../fixtures/assigned-topics-fixtures";
import { cloneJSON } from "discourse-common/lib/object";
import { test } from "qunit";

acceptance(
  "Discourse Assign | Unassign/reassign from the topics list",
  function (needs) {
    needs.user();
    needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });
    needs.pretender((server, helper) => {
      const messagesPath = "/topics/messages-assigned/eviltrout.json";
      const assigns = AssignedTopics[messagesPath];
      server.get(messagesPath, () => helper.response(assigns));
    });

    test("Unassign/reassign options are visible", async function (assert) {
      const options = selectKit(".assign-actions-dropdown");

      await visit("/u/eviltrout/activity/assigned");
      await options.expand();

      assert.strictEqual(count("li[data-value='unassign']"), 1);
      assert.strictEqual(count("li[data-value='reassign']"), 1);
    });
  }
);

acceptance(
  "Discourse Assign | A user doesn't have assignments",
  function (needs) {
    needs.user();
    needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });
    needs.pretender((server, helper) => {
      const assignments = cloneJSON(
        AssignedTopics["/topics/messages-assigned/eviltrout.json"]
      );
      assignments.topic_list.topics = [];
      server.get("/topics/messages-assigned/eviltrout.json", () =>
        helper.response(assignments)
      );
    });

    test("It renders the empty state panel", async function (assert) {
      await visit("/u/eviltrout/activity/assigned");
      assert.ok(exists("div.empty-state"));
    });

    test("It does not render the search form", async function (assert) {
      await visit("/u/eviltrout/activity/assigned");
      assert.notOk(exists("div.topic-search-div"));
    });
  }
);
