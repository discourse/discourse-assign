import { test } from "qunit";
import {
  acceptance,
  query,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { visit } from "@ember/test-helpers";
import { cloneJSON } from "discourse-common/lib/object";
import I18n from "I18n";
import topicFixtures from "discourse/tests/fixtures/topic";
import selectKit from "discourse/tests/helpers/select-kit-helper";
import NotificationFixture from "../fixtures/notifications-fixtures";

function assignCurrentUserToTopic(needs) {
  needs.pretender((server, helper) => {
    server.get("/t/44.json", () => {
      let topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
      topic["assigned_to_user"] = {
        username: "eviltrout",
        name: "Robin Ward",
        avatar_template:
          "/letter_avatar/eviltrout/{size}/3_f9720745f5ce6dfc2b5641fca999d934.png",
      };
      topic["assignment_note"] = "Shark Doododooo";
      topic["assignment_status"] = "New";
      topic["indirectly_assigned_to"] = {
        2: {
          assigned_to: {
            name: "Developers",
          },
          post_number: 2,
          assignment_note: '<script>alert("xss")</script>',
        },
      };
      return helper.response(topic);
    });

    server.get("/t/45.json", () => {
      let topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
      topic["assigned_to_group"] = {
        name: "Developers",
      };
      return helper.response(topic);
    });

    server.get("/notifications", () => {
      return helper.response(
        NotificationFixture["/assign/notifications/eviltrout"]
      );
    });
  });
}

function assignNewUserToTopic(needs) {
  needs.pretender((server, helper) => {
    server.get("/t/44.json", () => {
      let topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
      topic["assigned_to_user"] = {
        username: "isaacjanzen",
        name: "Isaac Janzen",
        avatar_template:
          "/letter_avatar/isaacjanzen/{size}/3_f9720745f5ce6dfc2b5641fca999d934.png",
      };
      topic["indirectly_assigned_to"] = {
        2: {
          assigned_to: {
            name: "Developers",
          },
          post_number: 2,
        },
      };
      return helper.response(topic);
    });

    server.get("/t/45.json", () => {
      let topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
      topic["assigned_to_group"] = {
        name: "Developers",
      };
      return helper.response(topic);
    });
  });
}

acceptance("Discourse Assign | Assigned topic", function (needs) {
  needs.user();
  needs.settings({
    assign_enabled: true,
    tagging_enabled: true,
    assigns_user_url_path: "/",
    assigns_public: true,
    enable_assign_status: true,
  });

  assignCurrentUserToTopic(needs);

  test("Shows user assignment info", async function (assert) {
    updateCurrentUser({ can_assign: true });
    await visit("/t/assignment-topic/44");

    assert
      .dom("#topic-title .assigned-to")
      .hasText("eviltrout", "shows assignment in the header");
    assert
      .dom("#post_1 .assigned-to")
      .hasText(
        "Assigned topic to eviltrout#2 to Developers",
        "shows assignment and indirect assignments in the first post"
      );
    assert.dom("#post_1 .assigned-to svg.d-icon-user-plus").exists();
    assert
      .dom(".discourse-tags .assigned-to[href='/t/28830'] span")
      .hasAttribute("title", "Shark Doododooo", "shows topic assign notes");
    assert
      .dom(".discourse-tags .assigned-to[href='/p/2'] span")
      .hasAttribute(
        "title",
        '<script>alert("xss")</script>',
        "shows indirect assign notes"
      );
    assert
      .dom("#topic-footer-dropdown-reassign")
      .exists("shows reassign dropdown at the bottom of the topic");
  });

  test("Shows group assignment info", async function (assert) {
    updateCurrentUser({ can_assign: true });
    await visit("/t/assignment-topic/45");

    assert
      .dom("#topic-title .assigned-to")
      .hasText("Developers", "shows assignment in the header");
    assert
      .dom("#post_1 .assigned-to--group")
      .hasText(
        "Assigned topic to Developers",
        "shows assignment in the first post"
      );
    assert.dom("#post_1 .assigned-to svg.d-icon-group-plus").exists();
    assert
      .dom("#topic-footer-dropdown-reassign")
      .exists("shows reassign dropdown at the bottom of the topic");
  });

  test("User without assign ability cannot see footer button", async function (assert) {
    updateCurrentUser({ can_assign: false, admin: false, moderator: false });
    await visit("/t/assignment-topic/45");

    assert
      .dom("#topic-footer-dropdown-reassign")
      .doesNotExist(
        "does not show reassign dropdown at the bottom of the topic"
      );
  });

  test("Shows assignment notification", async function (assert) {
    updateCurrentUser({ can_assign: true });

    await visit("/u/eviltrout/notifications");

    const notification = query(
      "section.user-content ul.notifications li.item.notification"
    );

    assert.true(
      notification.children[0].classList.contains("assigned"),
      "with correct assigned class"
    );

    assert.strictEqual(
      notification.querySelector("a").title,
      I18n.t("notifications.titles.assigned"),
      "with correct title"
    );
    assert.strictEqual(
      notification.querySelector("svg use").href["baseVal"],
      "#user-plus",
      "with correct icon"
    );
  });
});

acceptance("Discourse Assign | Reassign topic", function (needs) {
  needs.user();
  needs.settings({
    assign_enabled: true,
    tagging_enabled: true,
    assigns_user_url_path: "/",
  });

  assignNewUserToTopic(needs);

  test("Reassign Footer dropdown contains reassign buttons", async function (assert) {
    updateCurrentUser({ can_assign: true });
    const menu = selectKit("#topic-footer-dropdown-reassign");

    await visit("/t/assignment-topic/44");
    await menu.expand();

    assert.true(menu.rowByValue("unassign").exists());
    assert.true(menu.rowByValue("reassign").exists());
    assert.true(menu.rowByValue("reassign-self").exists());
  });
});

acceptance("Discourse Assign | Reassign topic | mobile", function (needs) {
  needs.user();
  needs.mobileView();
  needs.settings({
    assign_enabled: true,
    tagging_enabled: true,
    assigns_user_url_path: "/",
  });

  assignNewUserToTopic(needs);

  test("Mobile Footer dropdown contains reassign buttons", async function (assert) {
    updateCurrentUser({ can_assign: true });
    const menu = selectKit(".topic-footer-mobile-dropdown");

    await visit("/t/assignment-topic/44");
    await menu.expand();

    assert.true(menu.rowByValue("unassign-mobile").exists());
    assert.true(menu.rowByValue("reassign-mobile").exists());
    assert.true(menu.rowByValue("reassign-self-mobile").exists());
  });
});

acceptance("Discourse Assign | Reassign topic conditionals", function (needs) {
  needs.user();
  needs.settings({
    assign_enabled: true,
    tagging_enabled: true,
    assigns_user_url_path: "/",
  });

  assignCurrentUserToTopic(needs);

  test("Reassign Footer dropdown won't display reassign-to-self button when already assigned to current user", async function (assert) {
    updateCurrentUser({ can_assign: true });
    const menu = selectKit("#topic-footer-dropdown-reassign");

    await visit("/t/assignment-topic/44");
    await menu.expand();

    assert.false(menu.rowByValue("reassign-self").exists());
  });
});
