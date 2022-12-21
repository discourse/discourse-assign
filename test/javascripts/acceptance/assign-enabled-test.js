import selectKit from "discourse/tests/helpers/select-kit-helper";
import { cloneJSON } from "discourse-common/lib/object";
import userFixtures from "discourse/tests/fixtures/user-fixtures";
import {
  acceptance,
  exists,
  updateCurrentUser,
} from "discourse/tests/helpers/qunit-helpers";
import { click, visit } from "@ember/test-helpers";
import { test } from "qunit";

acceptance("Discourse Assign | Assign mobile", function (needs) {
  needs.user();
  needs.mobileView();
  needs.settings({ assign_enabled: true });

  needs.pretender((server, helper) => {
    server.get("/assign/suggestions", () => {
      return helper.response({
        success: true,
        assign_allowed_groups: false,
        assign_allowed_for_groups: [],
        suggestions: [
          {
            id: 19,
            username: "eviltrout",
            name: "Robin Ward",
            avatar_template:
              "/user_avatar/meta.discourse.org/eviltrout/{size}/5275_2.png",
          },
        ],
      });
    });

    server.put("/assign/assign", () => {
      return helper.response({ success: true });
    });
  });

  test("Footer dropdown contains button", async function (assert) {
    updateCurrentUser({ can_assign: true });
    await visit("/t/internationalization-localization/280");
    const menu = selectKit(".topic-footer-mobile-dropdown");
    await menu.expand();

    assert.ok(menu.rowByValue("assign").exists());
    await menu.selectRowByValue("assign");
    assert.ok(exists(".assign.modal-body"), "assign modal opens");
  });
});

acceptance("Discourse Assign | Assign desktop", function (needs) {
  needs.user({
    can_assign: true,
  });
  needs.settings({ assign_enabled: true });

  needs.pretender((server, helper) => {
    server.get("/assign/suggestions", () => {
      return helper.response({
        success: true,
        assign_allowed_groups: false,
        assign_allowed_for_groups: [],
        suggestions: [
          {
            id: 19,
            username: "eviltrout",
            name: "Robin Ward",
            avatar_template:
              "/user_avatar/meta.discourse.org/eviltrout/{size}/5275_2.png",
          },
        ],
      });
    });

    server.put("/assign/assign", () => {
      return helper.response({ success: true });
    });
  });

  test("Post contains hidden assign button", async function (assert) {
    await visit("/t/internationalization-localization/280");

    assert.ok(
      !exists("#post_2 .extra-buttons .d-icon-user-plus"),
      "assign to post button is hidden"
    );
    await click("#post_2 button.show-more-actions");

    assert.ok(
      exists("#post_2 .extra-buttons .d-icon-user-plus"),
      "assign to post button exists"
    );
    await click("#post_2 .extra-buttons .d-icon-user-plus");
    assert.ok(exists(".assign.modal-body"), "assign modal opens");
  });

  test("Footer dropdown contains button", async function (assert) {
    await visit("/t/internationalization-localization/280");
    await click("#topic-footer-button-assign");

    assert.ok(exists(".assign.modal-body"), "assign modal opens");
  });
});

acceptance("Discourse Assign | Assign Status enabled", function (needs) {
  needs.user({
    can_assign: true,
  });
  needs.settings({
    assign_enabled: true,
    enable_assign_status: true,
    assign_statuses: "New|In Progress|Done",
  });

  needs.pretender((server, helper) => {
    server.get("/assign/suggestions", () => {
      return helper.response({
        success: true,
        assign_allowed_groups: false,
        assign_allowed_for_groups: [],
        suggestions: [
          {
            id: 19,
            username: "eviltrout",
            name: "Robin Ward",
            avatar_template:
              "/user_avatar/meta.discourse.org/eviltrout/{size}/5275_2.png",
          },
        ],
      });
    });

    server.put("/assign/assign", () => {
      return helper.response({ success: true });
    });
  });

  test("Modal contains status dropdown", async function (assert) {
    await visit("/t/internationalization-localization/280");
    await click("#topic-footer-button-assign");

    assert.ok(
      exists(".assign.modal-body #assign-status"),
      "assign status dropdown exists"
    );
  });
});

acceptance("Discourse Assign | Assign Status disabled", function (needs) {
  needs.user({
    can_assign: true,
  });
  needs.settings({ assign_enabled: true, enable_assign_status: false });

  needs.pretender((server, helper) => {
    server.get("/assign/suggestions", () => {
      return helper.response({
        success: true,
        assign_allowed_groups: false,
        assign_allowed_for_groups: [],
        suggestions: [
          {
            id: 19,
            username: "eviltrout",
            name: "Robin Ward",
            avatar_template:
              "/user_avatar/meta.discourse.org/eviltrout/{size}/5275_2.png",
          },
        ],
      });
    });

    server.put("/assign/assign", () => {
      return helper.response({ success: true });
    });
  });

  test("Modal contains status dropdown", async function (assert) {
    await visit("/t/internationalization-localization/280");
    await click("#topic-footer-button-assign");

    assert.notOk(
      exists(".assign.modal-body #assign-status"),
      "assign status dropdown doesn't exists"
    );
  });
});

// See RemindAssignsFrequencySiteSettings
const remindersFrequency = [
  {
    name: "discourse_assign.reminders_frequency.never",
    value: 0,
  },
  {
    name: "discourse_assign.reminders_frequency.daily",
    value: 1440,
  },
  {
    name: "discourse_assign.reminders_frequency.weekly",
    value: 10080,
  },
  {
    name: "discourse_assign.reminders_frequency.monthly",
    value: 43200,
  },
  {
    name: "discourse_assign.reminders_frequency.quarterly",
    value: 129600,
  },
];

acceptance("Discourse Assign | User preferences", function (needs) {
  needs.user({ can_assign: true, reminders_frequency: remindersFrequency });
  needs.settings({
    assign_enabled: true,
    remind_assigns_frequency: 43200,
  });

  test("The frequency for assigned topic reminders defaults to the site setting", async function (assert) {
    await visit("/u/eviltrout/preferences/notifications");

    assert.strictEqual(
      selectKit("#remind-assigns-frequency").header().value(),
      "43200",
      "set frequency to default of Monthly"
    );
  });

  test("The user can change the frequency to Never", async function (assert) {
    await visit("/u/eviltrout/preferences/notifications");

    await selectKit("#remind-assigns-frequency").expand();
    await selectKit("#remind-assigns-frequency").selectRowByValue(0);

    assert.strictEqual(
      selectKit("#remind-assigns-frequency").header().value(),
      "0",
      "set frequency to Never"
    );
  });

  test("The user can change the frequency to some other non-default value", async function (assert) {
    await visit("/u/eviltrout/preferences/notifications");

    await selectKit("#remind-assigns-frequency").expand();
    await selectKit("#remind-assigns-frequency").selectRowByValue(10080); // weekly

    assert.strictEqual(
      selectKit("#remind-assigns-frequency").header().value(),
      "10080",
      "set frequency to Weekly"
    );
  });
});

acceptance(
  "Discourse Assign | User preferences | Pre-selected reminder frequency",
  function (needs) {
    needs.user({ can_assign: true, reminders_frequency: remindersFrequency });
    needs.settings({
      assign_enabled: true,
      remind_assigns_frequency: 43200,
    });

    needs.pretender((server, helper) => {
      server.get("/u/eviltrout.json", () => {
        let json = cloneJSON(userFixtures["/u/eviltrout.json"]);
        json.user.custom_fields = { remind_assigns_frequency: 10080 };

        // usually this is done automatically by this pretender but we
        // have to do it manually here because we are overriding the
        // pretender see app/assets/javascripts/discourse/tests/helpers/create-pretender.js
        json.user.can_edit = true;

        return helper.response(200, json);
      });
    });

    test("The user's previously selected value is loaded", async function (assert) {
      await visit("/u/eviltrout/preferences/notifications");

      assert.strictEqual(
        selectKit("#remind-assigns-frequency").header().value(),
        "10080",
        "frequency is pre-selected to Weekly"
      );
    });
  }
);
