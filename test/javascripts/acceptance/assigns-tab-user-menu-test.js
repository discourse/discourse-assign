import {
  acceptance,
  query,
  queryAll,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { click, currentURL, visit } from "@ember/test-helpers";
import { test } from "qunit";
import I18n from "I18n";
import { withPluginApi } from "discourse/lib/plugin-api";

const USER_MENU_ASSIGN_RESPONSE = {
  notifications: [
    {
      id: 1716,
      user_id: 1,
      notification_type: 34,
      read: false,
      high_priority: true,
      created_at: "2022-08-11T21:32:32.404Z",
      post_number: 1,
      topic_id: 227,
      fancy_title: "Test poll topic please bear with me",
      slug: "test-poll-topic-please-bear-with-me",
      data: {
        message: "discourse_assign.assign_notification",
        display_username: "tony",
        topic_title: "Test poll topic please bear with me",
        assignment_id: 2,
      },
    },
  ],
  topics: [
    {
      id: 209,
      title: "Howdy this a test topic!",
      fancy_title: "Howdy this <b>my test topic</b> with emoji :heart:!",
      slug: "howdy-this-a-test-topic",
      posts_count: 1,
      reply_count: 0,
      highest_post_number: 1,
      image_url: null,
      created_at: "2022-03-10T20:09:25.772Z",
      last_posted_at: "2022-03-10T20:09:25.959Z",
      bumped: true,
      bumped_at: "2022-03-10T20:09:25.959Z",
      archetype: "regular",
      unseen: false,
      last_read_post_number: 2,
      unread: 0,
      new_posts: 0,
      unread_posts: 0,
      pinned: false,
      unpinned: null,
      visible: true,
      closed: false,
      archived: false,
      notification_level: 3,
      bookmarked: false,
      liked: false,
      thumbnails: null,
      tags: [],
      tags_descriptions: {},
      views: 11,
      like_count: 7,
      has_summary: false,
      last_poster_username: "osama",
      category_id: 1,
      pinned_globally: false,
      featured_link: null,
      assigned_to_user: {
        id: 1,
        username: "osama",
        name: "Osama.OG",
        avatar_template: "/letter_avatar_proxy/v4/letter/o/f05b48/{size}.png",
        assign_icon: "user-plus",
        assign_path: "/u/osama/activity/assigned",
      },
      posters: [
        {
          extras: "latest single",
          description: "Original Poster, Most Recent Poster",
          user_id: 1,
          primary_group_id: 45,
          flair_group_id: 45,
        },
      ],
    },
    {
      id: 173,
      title: "Owners elegance entrance startled spirits losing",
      fancy_title:
        "Owners <i>elegance entrance :car: startled</i> spirits losing",
      slug: "owners-elegance-entrance-startled-spirits-losing",
      posts_count: 7,
      reply_count: 0,
      highest_post_number: 7,
      image_url: null,
      created_at: "2021-07-11T04:50:17.029Z",
      last_posted_at: "2021-12-24T17:21:03.418Z",
      bumped: true,
      bumped_at: "2021-12-24T17:21:03.418Z",
      archetype: "regular",
      unseen: false,
      last_read_post_number: 3,
      unread: 0,
      new_posts: 0,
      unread_posts: 0,
      pinned: false,
      unpinned: null,
      visible: true,
      closed: false,
      archived: false,
      notification_level: 1,
      bookmarked: false,
      liked: false,
      thumbnails: null,
      tags: ["music", "job-application"],
      tags_descriptions: {},
      views: 23,
      like_count: 24,
      has_summary: false,
      last_poster_username: "ambrose.bradtke",
      category_id: 1,
      pinned_globally: false,
      featured_link: null,
      assigned_to_group: {
        id: 45,
        automatic: false,
        name: "Team",
        user_count: 4,
        mentionable_level: 99,
        messageable_level: 99,
        visibility_level: 0,
        primary_group: true,
        title: "",
        grant_trust_level: null,
        incoming_email: null,
        has_messages: true,
        flair_url: null,
        flair_bg_color: "",
        flair_color: "",
        bio_raw: "",
        bio_cooked: null,
        bio_excerpt: null,
        public_admission: true,
        public_exit: true,
        allow_membership_requests: false,
        full_name: "",
        default_notification_level: 3,
        membership_request_template: "",
        members_visibility_level: 0,
        can_see_members: true,
        can_admin_group: true,
        publish_read_state: true,
        assign_icon: "group-plus",
        assign_path: "/g/Team/assigned/everyone",
      },
      posters: [
        {
          extras: null,
          description: "Original Poster",
          user_id: 26,
          primary_group_id: null,
          flair_group_id: null,
        },
        {
          extras: null,
          description: "Frequent Poster",
          user_id: 16,
          primary_group_id: null,
          flair_group_id: null,
        },
        {
          extras: null,
          description: "Frequent Poster",
          user_id: 22,
          primary_group_id: null,
          flair_group_id: null,
        },
        {
          extras: null,
          description: "Frequent Poster",
          user_id: 12,
          primary_group_id: null,
          flair_group_id: null,
        },
        {
          extras: "latest",
          description: "Most Recent Poster",
          user_id: 13,
          primary_group_id: null,
          flair_group_id: null,
        },
      ],
    },
  ],
};

acceptance(
  "Discourse Assign | user menu | user cannot assign",
  function (needs) {
    needs.user({
      can_assign: false,
    });
    needs.settings({
      assign_enabled: true,
    });

    test("the assigns tab is not shown", async function (assert) {
      await visit("/");
      await click(".d-header-icons .current-user");
      assert.dom("#user-menu-button-assign-list").doesNotExist();
    });
  }
);

acceptance(
  "Discourse Assign | user menu | assign_enabled setting is disabled",
  function (needs) {
    needs.user({
      can_assign: false,
    });
    needs.settings({
      assign_enabled: false,
    });

    test("the assigns tab is not shown", async function (assert) {
      await visit("/");
      await click(".d-header-icons .current-user");
      assert.dom("#user-menu-button-assign-list").doesNotExist();
    });
  }
);

acceptance("Discourse Assign | user menu", function (needs) {
  needs.user({
    can_assign: true,
    grouped_unread_notifications: {
      34: 173, // assigned notification type
    },
  });

  needs.settings({
    assign_enabled: true,
  });

  let forceEmptyState = false;
  let markRead = false;
  let requestBody;

  needs.pretender((server, helper) => {
    server.get("/assign/user-menu-assigns.json", () => {
      if (forceEmptyState) {
        return helper.response({ notifications: [], topics: [] });
      } else {
        return helper.response(USER_MENU_ASSIGN_RESPONSE);
      }
    });

    server.put("/notifications/mark-read", (request) => {
      requestBody = request.requestBody;
      markRead = true;
      return helper.response({ success: true });
    });

    server.get("/topics/messages-assigned/eviltrout.json", () => {
      return helper.response({
        users: [],
        topic_list: {
          topics: [],
        },
      });
    });
  });

  needs.hooks.afterEach(() => {
    forceEmptyState = false;
    markRead = false;
    requestBody = null;
  });

  test("assigns tab", async function (assert) {
    await visit("/");
    await click(".d-header-icons .current-user");
    assert.dom("#user-menu-button-assign-list").exists("assigns tab exists");
    assert
      .dom("#user-menu-button-assign-list .d-icon-user-plus")
      .exists("assigns tab has the user-plus icon");
    assert
      .dom("#user-menu-button-assign-list .badge-notification")
      .hasText("173", "assigns tab has a count badge");

    updateCurrentUser({
      grouped_unread_notifications: {},
    });

    assert
      .dom("#user-menu-button-assign-list .badge-notification")
      .doesNotExist("badge count disappears when it goes to zero");
    assert
      .dom("#user-menu-button-assign-list")
      .exists("assigns tab still exists");
  });

  test("clicking on the assign tab when it's already selected navigates to the user's assignments page", async function (assert) {
    await visit("/");
    await click(".d-header-icons .current-user");
    await click("#user-menu-button-assign-list");
    await click("#user-menu-button-assign-list");

    assert.strictEqual(
      currentURL(),
      "/u/eviltrout/activity/assigned",
      "user is navigated to their assignments page"
    );
  });

  test("displays unread assign notifications on top and fills the remaining space with read assigns", async function (assert) {
    await visit("/");
    await click(".d-header-icons .current-user");
    await click("#user-menu-button-assign-list");

    const notifications = queryAll("#quick-access-assign-list .notification");
    assert.strictEqual(
      notifications.length,
      1,
      "there is one unread notification"
    );
    assert.true(
      notifications[0].classList.contains("unread"),
      "the notification is unread"
    );
    assert.true(
      notifications[0].classList.contains("assigned"),
      "the notification is of type assigned"
    );

    const assigns = queryAll("#quick-access-assign-list .assign");
    assert.strictEqual(assigns.length, 2, "there are 2 assigns");

    const userAssign = assigns[0];
    const groupAssign = assigns[1];
    assert.ok(
      userAssign.querySelector(".d-icon-user-plus"),
      "user assign has the right icon"
    );
    assert.ok(
      groupAssign.querySelector(".d-icon-group-plus"),
      "group assign has the right icon"
    );

    assert.true(
      userAssign
        .querySelector("a")
        .href.endsWith("/t/howdy-this-a-test-topic/209/3"),
      "user assign links to the first unread post (last read post + 1)"
    );
    assert.true(
      groupAssign
        .querySelector("a")
        .href.endsWith(
          "/t/owners-elegance-entrance-startled-spirits-losing/173/4"
        ),
      "group assign links to the first unread post (last read post + 1)"
    );

    assert.strictEqual(
      userAssign.textContent.trim(),
      "Howdy this my test topic with emoji !",
      "user assign contains the topic title"
    );
    assert.ok(
      userAssign.querySelector(".item-description img.emoji"),
      "emojis are rendered in user assign"
    );
    assert.strictEqual(
      userAssign.querySelector(".item-description b").textContent.trim(),
      "my test topic",
      "user assign topic title is trusted"
    );

    assert.strictEqual(
      groupAssign.textContent.trim().replaceAll(/\s+/g, " "),
      "Owners elegance entrance startled spirits losing",
      "group assign contains the topic title"
    );
    assert.ok(
      groupAssign.querySelector(".item-description i img.emoji"),
      "emojis are rendered in group assign"
    );
    assert.strictEqual(
      groupAssign
        .querySelector(".item-description i")
        .textContent.trim()
        .replaceAll(/\s+/g, " "),
      "elegance entrance startled",
      "group assign topic title is trusted"
    );

    assert.strictEqual(
      userAssign.querySelector("a").title,
      I18n.t("user.assigned_to_you"),
      "user assign has the right title"
    );
    assert.strictEqual(
      groupAssign.querySelector("a").title,
      I18n.t("user.assigned_to_group", { group_name: "Team" }),
      "group assign has the right title"
    );
  });

  test("dismiss button", async function (assert) {
    await visit("/");
    await click(".d-header-icons .current-user");
    await click("#user-menu-button-assign-list");

    assert
      .dom("#user-menu-button-assign-list .badge-notification")
      .exists("badge count is visible before dismissing");

    await click(".notifications-dismiss");
    assert.false(markRead, "mark-read request isn't sent");
    assert.strictEqual(
      query(
        ".dismiss-notification-confirmation .modal-body"
      ).textContent.trim(),
      I18n.t("notifications.dismiss_confirmation.body.assigns", { count: 173 }),
      "dismiss confirmation modal is shown"
    );

    await click(".modal-footer .btn-primary");
    assert.true(markRead, "mark-read request is sent");
    assert.dom(".notifications-dismiss").doesNotExist("dismiss button is gone");
    assert
      .dom("#user-menu-button-assign-list .badge-notification")
      .doesNotExist("badge count is gone after dismissing");
    assert.strictEqual(
      requestBody,
      "dismiss_types=assigned",
      "mark-read request is sent with the right params"
    );
  });

  test("empty state", async function (assert) {
    forceEmptyState = true;
    await visit("/");
    await click(".d-header-icons .current-user");
    await click("#user-menu-button-assign-list");

    assert
      .dom(".empty-state-title")
      .hasText(
        I18n.t("user.no_assignments_title"),
        "empty state title is rendered"
      );
    assert.dom(".empty-state-body").exists("empty state body exists");
    assert
      .dom(".empty-state-body .d-icon-user-plus")
      .exists("empty state body has user-plus icon");
    assert.true(
      query(".empty-state-body a").href.endsWith(
        "/my/preferences/notifications"
      ),
      "empty state body has user-plus icon"
    );
  });

  test("assigns tab applies model transformations", async function (assert) {
    withPluginApi("0.1", (api) => {
      api.registerModelTransformer("notification", (notifications) => {
        notifications.forEach((notification) => {
          notification.fancy_title = `notificationModelTransformer ${notification.fancy_title}`;
        });
      });
      api.registerModelTransformer("topic", (topics) => {
        topics.forEach((topic) => {
          topic.fancy_title = `topicModelTransformer ${topic.fancy_title}`;
        });
      });
    });

    await visit("/");
    await click(".d-header-icons .current-user");
    await click("#user-menu-button-assign-list");

    const notification = query("#quick-access-assign-list ul li.notification");
    assert.strictEqual(
      notification.textContent.replace(/\s+/g, " ").trim(),
      "tony notificationModelTransformer Test poll topic please bear with me"
    );

    const assign = query("#quick-access-assign-list ul li.assign");
    assert.strictEqual(
      assign.textContent.replace(/\s+/g, " ").trim(),
      "topicModelTransformer Howdy this my test topic with emoji !"
    );
  });

  test("renders the confirmation modal when dismiss assign notifications", async function (assert) {
    await visit("/");
    await click(".d-header-icons .current-user");
    await click("#user-menu-button-assign-list");
    await click(".notifications-dismiss");
    assert.false(markRead, "a request to the server is not made");
    assert
      .dom(".dismiss-notification-confirmation .modal-body")
      .exists("the dismiss notification confirmation modal is present");
  });
});
