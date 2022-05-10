import { discourseModule } from "discourse/tests/helpers/qunit-helpers";
import { test } from "qunit";
import pretender from "discourse/tests/helpers/create-pretender";
import EmberObject from "@ember/object";

discourseModule("Unit | Controller | assign-user", function (hooks) {
  hooks.beforeEach(function () {
    pretender.get("/assign/suggestions", () => {
      return [
        200,
        { "Content-Type": "application/json" },
        {
          suggestions: [],
          assign_allowed_on_groups: [],
          assign_allowed_for_groups: [],
        },
      ];
    });

    pretender.put("/assign/assign", () => {
      return [200, { "Content-Type": "application/json" }, {}];
    });
  });

  test("assigning a user closes the modal", function (assert) {
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
