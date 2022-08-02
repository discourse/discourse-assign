import { discourseModule } from "discourse/tests/helpers/qunit-helpers";
import { test } from "qunit";
import sinon from "sinon";
import * as showModal from "discourse/lib/show-modal";
import pretender from "discourse/tests/helpers/create-pretender";

discourseModule("Unit | Service | task-actions", function () {
  test("assign", function (assert) {
    const stub = sinon.stub(showModal, "default").returns("the modal");
    const service = this.container.lookup("service:task-actions");
    const target = {
      assigned_to_user: { username: "tomtom" },
      assigned_to_group: { name: "cats" },
    };

    const modal = service.assign(target);

    const modalCall = stub.getCall(0).args;

    assert.equal(modal, "the modal");
    assert.deepEqual(modalCall[0], "assign-user");
    assert.deepEqual(modalCall[1], {
      title: "discourse_assign.assign_modal.title",
      model: {
        description: "discourse_assign.assign_modal.description",
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
    const service = this.container.lookup("service:task-actions");
    const target = { id: 1 };
    const user = { username: "tomtom" };
    let assignRequest;
    pretender.put("/assign/assign", (request) => {
      assignRequest = request;
      return [200];
    });

    await service.reassignUserToTopic(user, target);

    assert.strictEqual(
      assignRequest.requestBody,
      "username=tomtom&target_id=1&target_type=Topic"
    );
  });
});
