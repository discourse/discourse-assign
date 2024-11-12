import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import DButton from "discourse/components/d-button";

export default class AssignButton extends Component {
  static shouldRender(args) {
    return !args.post.firstPost;
  }

  static hidden(args) {
    return args.post.assigned_to_user?.id !== args.state.currentUser.id;
  }

  @service taskActions;

  get icon() {
    return this.isAssigned ? "user-times" : "user-plus";
  }

  get isAssigned() {
    return this.args.post.assigned_to_user || this.args.post.assigned_to_group;
  }

  get title() {
    return this.isAssigned
      ? "discourse_assign.unassign_post.title"
      : "discourse_assign.assign_post.title";
  }

  @action
  acceptAnswer() {
    if (this.isAssigned) {
      unassignPost(this.args.post, this.taskActions);
    } else {
      assignPost(this.args.post, this.taskActions);
    }
  }

  <template>
    <DButton
      class={{if
        this.isAssigned
        "post-action-menu__unassign-post unassign-post"
        "post-action-menu__assign-post assign-post"
      }}
      ...attributes
      @action={{this.acceptAnswer}}
      @icon={{this.icon}}
      @title={{this.title}}
    />
  </template>
}

// TODO (glimmer-post-menu): Remove these exported functions and move the code into the button action after the widget code is removed
export function assignPost(post, taskActions) {
  taskActions.showAssignModal(post, {
    isAssigned: false,
    targetType: "Post",
  });
}

export async function unassignPost(post, taskActions) {
  await taskActions.unassign(post.id, "Post");
  delete post.topic.indirectly_assigned_to[post.id];
}
