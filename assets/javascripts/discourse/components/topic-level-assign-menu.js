import { getOwner } from "@ember/application";
import { htmlSafe } from "@ember/template";
import { renderAvatar } from "discourse/helpers/user-avatar";
import { iconHTML } from "discourse-common/lib/icon-library";
import I18n from "I18n";

const DEPENDENT_KEYS = [
  "topic.assigned_to_user",
  "topic.assigned_to_group",
  "currentUser.can_assign",
  "topic.assigned_to_user.username",
];

export default {
  id: "reassign",
  dependentKeys: DEPENDENT_KEYS,
  classNames: ["reassign"],

  async action(id) {
    if (!this.currentUser?.can_assign) {
      return;
    }

    const taskActions = getOwner(this).lookup("service:task-actions");
    const firstPostId = this.topic.postStream.firstPostId;

    switch (id) {
      case "unassign": {
        this.set("topic.assigned_to_user", null);
        this.set("topic.assigned_to_group", null);

        await taskActions.unassign(this.topic.id);
        this.appEvents.trigger("post-stream:refresh", { id: firstPostId });
        break;
      }
      case "reassign-self": {
        this.set("topic.assigned_to_user", null);
        this.set("topic.assigned_to_group", null);

        await taskActions.reassignUserToTopic(this.currentUser, this.topic);
        this.appEvents.trigger("post-stream:refresh", { id: firstPostId });
        break;
      }
      case "reassign": {
        await taskActions.showAssignModal(this.topic, {
          targetType: "Topic",
          isAssigned: this.topic.isAssigned() || this.topic.hasAssignedPosts(),
          onSuccess: () =>
            this.appEvents.trigger("post-stream:refresh", { id: firstPostId }),
        });
        break;
      }
      default: {
        if (id.startsWith("unassign-from-post-")) {
          const postId = extractPostId(id);
          await taskActions.unassign(postId, "Post");
          delete this.topic.indirectly_assigned_to[postId];
          this.appEvents.trigger("post-stream:refresh", { id: firstPostId });
        }
      }
    }
  },

  noneItem() {
    const topic = this.topic;

    if (topic.assigned_to_user || topic.hasAssignedPosts()) {
      return unassignUsersButton(topic.uniqueAssignees());
    } else if (topic.assigned_to_group) {
      return unassignGroupButton(topic.assigned_to_group);
    }
  },
  content() {
    const content = [];

    if (this.topic.isAssigned()) {
      content.push(unassignFromTopicButton(this.topic));
    }

    if (this.topic.hasAssignedPosts()) {
      content.push(...unassignFromPostButtons(this.topic));
    }

    if (this.topic.isAssigned() && !this.topic.isAssignedTo(this.currentUser)) {
      content.push(reassignToSelfButton());
    }

    content.push(editAssignmentsButton());

    return content;
  },

  displayed() {
    return (
      this.currentUser?.can_assign &&
      !this.site.mobileView &&
      (this.topic.isAssigned() || this.topic.hasAssignedPosts())
    );
  },
};

function unassignGroupButton(group) {
  const label = I18n.t("discourse_assign.unassign.title");
  return {
    id: null,
    name: I18n.t("discourse_assign.reassign_modal.title"),
    label: htmlSafe(
      `<span class="unassign-label">${label}</span> @${group.name}...`
    ),
  };
}

function unassignUsersButton(users) {
  let avatars = "";
  if (users.length === 1) {
    avatars = avatarHtml(users[0], "tiny");
  } else if (users.length > 1) {
    avatars =
      avatarHtml(users[0], "tiny", "overlap") + avatarHtml(users[1], "tiny");
  }

  const label = `<span class="unassign-label">${I18n.t(
    "discourse_assign.topic_level_menu.unassign_with_ellipsis"
  )}</span>`;

  return {
    id: null,
    name: htmlSafe(
      I18n.t("discourse_assign.topic_level_menu.unassign_with_ellipsis")
    ),
    label: htmlSafe(`${avatars}${label}`),
  };
}

function avatarHtml(user, size, classes) {
  return renderAvatar(user, {
    imageSize: size,
    extraClasses: classes,
    ignoreTitle: true,
  });
}

function extractPostId(buttonId) {
  // buttonId format is "unassign-from-post-${postId}"
  const start = buttonId.lastIndexOf("-") + 1;
  return buttonId.substring(start);
}

function editAssignmentsButton() {
  const icon = iconHTML("pencil-alt");
  const label = I18n.t("discourse_assign.topic_level_menu.edit_assignments");
  return {
    id: "reassign",
    name: htmlSafe(label),
    label: htmlSafe(`${icon} ${label}`),
  };
}

function reassignToSelfButton() {
  const icon = iconHTML("user-plus");
  const label = I18n.t(
    "discourse_assign.topic_level_menu.reassign_topic_to_me"
  );
  return {
    id: "reassign-self",
    name: htmlSafe(label),
    label: htmlSafe(`${icon} ${label}`),
  };
}

function unassignFromTopicButton(topic) {
  const username =
    topic.assigned_to_user?.username || topic.assigned_to_group?.name;
  const icon = topic.assigned_to_user
    ? avatarHtml(topic.assigned_to_user, "small")
    : iconHTML("user-times");
  const label = I18n.t(
    "discourse_assign.topic_level_menu.unassign_from_topic",
    { username }
  );

  return {
    id: "unassign",
    name: htmlSafe(label),
    label: htmlSafe(`${icon} ${label}`),
  };
}

function unassignFromPostButtons(topic) {
  if (!topic.hasAssignedPosts()) {
    return [];
  }

  const max_buttons = 10;
  return Object.entries(topic.indirectly_assigned_to)
    .slice(0, max_buttons)
    .map(([postId, assignment]) => unassignFromPostButton(postId, assignment));
}

function unassignFromPostButton(postId, assignment) {
  let assignee, icon;
  const assignedToUser = !!assignment.assigned_to.username;
  if (assignedToUser) {
    assignee = assignment.assigned_to.username;
    icon = avatarHtml(assignment.assigned_to, "small");
  } else {
    assignee = assignment.assigned_to.name;
    icon = iconHTML("group-times");
  }

  const label = I18n.t("discourse_assign.topic_level_menu.unassign_from_post", {
    assignee,
    post_number: assignment.post_number,
  });
  const dataName = I18n.t(
    "discourse_assign.topic_level_menu.unassign_from_post_help",
    {
      assignee,
      post_number: assignment.post_number,
    }
  );
  return {
    id: `unassign-from-post-${postId}`,
    name: htmlSafe(dataName),
    label: htmlSafe(`${icon} ${label}`),
  };
}
