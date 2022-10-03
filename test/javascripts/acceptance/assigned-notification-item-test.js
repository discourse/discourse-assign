import { click, visit } from "@ember/test-helpers";
import { acceptance, query } from "discourse/tests/helpers/qunit-helpers";
import { test } from "qunit";

acceptance("Discourse Assign | Assignment notifications", function (needs) {
  needs.user();
  needs.settings({ assign_enabled: true, assigns_user_url_path: "/" });

  needs.pretender((server, helper) => {
    server.get("/notifications", () =>
      helper.response({
        notifications: [
          {
            id: 43,
            user_id: 2,
            notification_type: 34,
            read: false,
            high_priority: true,
            created_at: "2022-01-01T12:00:00.000Z",
            post_number: 1,
            topic_id: 43,
            fancy_title: "An assigned topic",
            slug: "user-assigned-topic",
            data: {
              message: "discourse_assign.assign_notification",
              display_username: "Username",
              topic_title: "An assigned topic",
              assignment_id: 4,
            },
          },
          {
            id: 42,
            user_id: 2,
            notification_type: 34,
            read: false,
            high_priority: true,
            created_at: "2022-01-01T12:00:00.000Z",
            post_number: 1,
            topic_id: 42,
            fancy_title: "A group assigned topic",
            slug: "group-assigned-topic",
            data: {
              message: "discourse_assign.assign_group_notification",
              display_username: "Groupname",
              topic_title: "A group assigned topic",
              assignment_id: 3,
            },
          },
        ],
        seen_notification_id: 43,
      })
    );
  });

  test("Shows the right icons", async (assert) => {
    await visit("/");
    await click("#current-user.header-dropdown-toggle");

    const userAssignment = query(".quick-access-panel li:nth-child(1) a");
    assert.ok(
      [...userAssignment.querySelector(".d-icon").classList].includes(
        "d-icon-user-plus"
      )
    );

    const groupAssignment = query(".quick-access-panel li:nth-child(2) a");
    assert.ok(
      [...groupAssignment.querySelector(".d-icon").classList].includes(
        "d-icon-group-plus"
      )
    );
  });
});
