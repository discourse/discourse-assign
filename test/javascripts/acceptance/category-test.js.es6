import {
  acceptance,
  exists,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { visit } from "@ember/test-helpers";
import { test } from "qunit";
import I18n from "I18n";
import DiscoveryFixtures from "discourse/tests/fixtures/discovery-fixtures";

function stubCategory(needs, customFields) {
  needs.site({
    categories: [
      {
        id: 6,
        name: "test",
        slug: "test",
        custom_fields: customFields,
      },
    ],
  });

  needs.pretender((server, helper) => {
    server.get("/c/test/6/l/latest.json", () => {
      return helper.response(
        DiscoveryFixtures["/latest_can_create_topic.json"]
      );
    });
  });
}

acceptance(
  "Discourse Assign | Categories for users that can assign",
  function (needs) {
    needs.user();
    needs.settings({
      assign_enabled: true,
      assigns_user_url_path: "/",
      assigns_public: false,
    });
    stubCategory(needs, { enable_unassigned_filter: "true" });

    test("can see Unassigned button", async (assert) => {
      updateCurrentUser({ can_assign: true });
      await visit("/c/test");

      const title = I18n.t("filters.unassigned.help");
      assert.ok(exists(`#navigation-bar li[title='${title}']`));
    });
  }
);

acceptance(
  "Discourse Assign | Categories without enable_unassigned_filter",
  function (needs) {
    needs.user();
    needs.settings({
      assign_enabled: true,
      assigns_user_url_path: "/",
      assigns_public: false,
    });
    stubCategory(needs, { enable_unassigned_filter: "false" });

    test("cannot see Unassigned button", async (assert) => {
      updateCurrentUser({ can_assign: true });
      await visit("/c/test");

      const title = I18n.t("filters.unassigned.help");
      assert.ok(!exists(`#navigation-bar li[title='${title}']`));
    });
  }
);

acceptance(
  "Discourse Assign | Categories when assigns are public",
  function (needs) {
    needs.user();
    needs.settings({
      assign_enabled: true,
      assigns_user_url_path: "/",
      assigns_public: true,
    });
    stubCategory(needs, { enable_unassigned_filter: "true" });

    test("can see Unassigned button", async (assert) => {
      updateCurrentUser({ can_assign: false });
      await visit("/c/test");

      const title = I18n.t("filters.unassigned.help");
      assert.ok(exists(`#navigation-bar li[title='${title}']`));
    });
  }
);

acceptance(
  "Discourse Assign | Categories when assigns are private",
  function (needs) {
    needs.user();
    needs.settings({
      assign_enabled: true,
      assigns_user_url_path: "/",
      assigns_public: false,
    });
    stubCategory(needs, { enable_unassigned_filter: "true" });

    test("cannot see Unassigned button", async (assert) => {
      updateCurrentUser({ can_assign: false });
      await visit("/c/test");

      const title = I18n.t("filters.unassigned.help");
      assert.ok(!exists(`#navigation-bar li[title='${title}']`));
    });
  }
);
