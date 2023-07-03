import { module, test } from "qunit";
import { setupTest } from "ember-qunit";
import sinon from "sinon";
import * as showModal from "discourse/lib/show-modal";
import pretender, { response } from "discourse/tests/helpers/create-pretender";
import { getOwner } from "discourse-common/lib/get-owner";

module("Discourse Assign | Unit | Service | task-actions", function (hooks) {
  setupTest(hooks);

  test("assign", function (assert) {
    const stub = sinon.stub(showModal, "default").returns("the modal");
    const service = getOwner(this).lookup("service:task-actions");
    const target = {
      assigned_to_user: { username: "tomtom" },
      assigned_to_group: { name: "cats" },
    };

    const modal = service.assign(target);
    const modalCall = stub.getCall(0).args;

    assert.strictEqual(modal, "the modal");
    assert.strictEqual(modalCall[0], "assign-user");
    assert.deepEqual(modalCall[1], {
      title: "discourse_assign.assign_modal.title",
      model: {
        reassign: false,
        username: "tomtom",
        group_name: "cats",
        target,
        targetType: "Topic",
        status: undefined,
      },
    });
  });

  test("reassignUserToTopic", async function (assert) {
    const service = getOwner(this).lookup("service:task-actions");
    const target = { id: 1 };
    const user = { username: "tomtom" };
    let assignRequest;
    pretender.put("/assign/assign", (request) => {
      assignRequest = request;
      return response({});
    });

    await service.reassignUserToTopic(user, target);

    assert.strictEqual(
      assignRequest.requestBody,
      "username=tomtom&target_id=1&target_type=Topic"
    );
  });
});
