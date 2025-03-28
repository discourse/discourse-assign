import Component from "@glimmer/component";
import { concat } from "@ember/helper";
import icon from "discourse/helpers/d-icon";
import userPrioritizedName from "discourse/helpers/user-prioritized-name";
import { i18n } from "discourse-i18n";
import { assignedToGroupPath, assignedToUserPath } from "../lib/url";

export default class AssignedToFirstPost extends Component {
  get assignedToUser() {
    return this.args.post?.topic?.assigned_to_user;
  }

  get assignedToGroup() {
    return this.args.post?.topic?.assigned_to_group;
  }

  get icon() {
    return this.assignedToUser ? "user-plus" : "group-plus";
  }

  get indirectlyAssignedTo() {
    return this.args.post?.topic?.indirectly_assigned_to;
  }

  get indirectAssignments() {
    if (!this.indirectlyAssignedTo) {
      return null;
    }

    return Object.keys(this.indirectlyAssignedTo).map((postId) => {
      const postNumber = this.indirectlyAssignedTo[postId].post_number;

      return {
        postId,
        assignee: this.indirectlyAssignedTo[postId].assigned_to,
        postNumber,
        url: `${this.args.post.topic.url}/${postNumber}`,
      };
    });
  }

  get isAssigned() {
    return !!(
      this.assignedToUser ||
      this.assignedToGroup ||
      this.args.post?.topic?.indirectly_assigned_to
    );
  }

  <template>
    {{#if this.isAssigned}}
      <p class="assigned-to">
        {{icon this.icon}}
        {{#if this.assignedToUser}}
          <span class="assignee">
            <span class="assigned-to--user">
              {{i18n
                "discourse_assign.assigned_topic_to"
                username=(userPrioritizedName this.assignedToUser)
                path=(assignedToUserPath this.assignedToUser)
              }}
            </span>
          </span>
        {{/if}}

        {{#if this.assignedToGroup}}
          <span class="assignee">
            <span class="assigned-to--group">
              {{i18n
                "discourse_assign.assigned_topic_to"
                username=this.assignedToGroup.name
                path=(assignedToGroupPath this.assignedToGroup)
              }}
            </span>
          </span>
        {{/if}}

        {{#each this.indirectAssignments key="postId" as |indirectAssignment|}}
          <span class="assign-text">
            {{i18n "discourse_assign.assigned"}}
          </span>
          <span class="assignee">
            <a href={{indirectAssignment.url}} class="assigned-indirectly">
              {{i18n
                "discourse_assign.assign_post_to_multiple"
                post_number=indirectAssignment.postNumber
                username=(userPrioritizedName indirectAssignment.assignee)
              }}
            </a>
          </span>
        {{/each}}
      </p>
    {{/if}}
  </template>
}
