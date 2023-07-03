import { module, test } from "qunit";
import { setupRenderingTest } from "discourse/tests/helpers/component-test";
import EmberObject from "@ember/object";
import pretender, { response } from "discourse/tests/helpers/create-pretender";
import { getOwner } from "discourse-common/lib/get-owner";

module("Discourse Assign | Unit | Controller | assign-user", function (hooks) {
  setupRenderingTest(hooks);

  test("assigning a user by selector does not close the modal", async function (assert) {
    pretender.get("/assign/suggestions", () =>
      response({
        suggestions: [],
        assign_allowed_on_groups: ["nat"],
        assign_allowed_for_groups: [],
      })
    );

    let modalClosed = false;
    const controller = getOwner(this).lookup("controller:assign-user");
    controller.setProperties({
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

    assert.false(modalClosed);
  });
});
