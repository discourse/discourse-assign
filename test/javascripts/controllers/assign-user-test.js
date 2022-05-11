import EmberObject from "@ember/object";
import pretender from "discourse/tests/helpers/create-pretender";
import { discourseModule } from "discourse/tests/helpers/qunit-helpers";
import { test } from "qunit";
import { Promise } from "rsvp";

discourseModule("Unit | Controller | assign-user", function () {
  test("doesn't set suggestions and fails gracefully if controller is destroyed", function (assert) {
    let resolveSuggestions;
    pretender.get("/assign/suggestions", () => {
      return new Promise((resolve) => {
        resolveSuggestions = resolve;
      });
    });
    const controller = this.getController("assign-user", {
      model: {
        target: EmberObject.create({}),
      },
    });

    controller.destroy();
    resolveSuggestions([
      200,
      { "Content-Type": "application/json" },
      {
        suggestions: [],
        assign_allowed_on_groups: ["nat"],
        assign_allowed_for_groups: [],
      },
    ]);

    assert.strictEqual(controller.get("assign_allowed_on_groups"), undefined);
  });

  test("assigning a user closes the modal", function (assert) {
    pretender.get("/assign/suggestions", () => {
      return [
        200,
        { "Content-Type": "application/json" },
        {
          suggestions: [],
          assign_allowed_on_groups: ["nat"],
          assign_allowed_for_groups: [],
        },
      ];
    });
    pretender.put("/assign/assign", () => {
      return [200, { "Content-Type": "application/json" }, {}];
    });

    let modalClosed = false;
    const controller = this.getController("assign-user", {
      model: {
        target: EmberObject.create({}),
      },
      allowedGroupsForAssignment: ["nat"],
      taskActions: { allowedGroups: [] },
    });
    controller.set("actions.closeModal", () => {
      modalClosed = true;
    });

    controller.send("assignUser", "nat");

    assert.strictEqual(modalClosed, true);
  });
});
