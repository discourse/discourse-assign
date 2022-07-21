import EmberObject from "@ember/object";
import pretender from "discourse/tests/helpers/create-pretender";
import { discourseModule } from "discourse/tests/helpers/qunit-helpers";
import { test } from "qunit";

discourseModule("Unit | Controller | assign-user", function () {
  test("assigning a user via suggestions makes API call and closes the modal", async function (assert) {
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

    await controller.assignUser("nat");

    assert.strictEqual(modalClosed, true);
  });

  test("assigning a user by selector does not close the modal", async function (assert) {
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

    await controller.assignUsername("nat");

    assert.strictEqual(modalClosed, false);
  });
});
