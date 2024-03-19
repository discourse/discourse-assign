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

  async action(id) {
    if (!this.currentUser?.can_assign) {
      return;
    }

    const taskActions = getOwner(this).lookup("service:task-actions");

    switch (id) {
      case "unassign": {
        this.set("topic.assigned_to_user", null);
        this.set("topic.assigned_to_group", null);

        await taskActions.unassign(this.topic.id);

        this.appEvents.trigger("post-stream:refresh", {
          id: this.topic.postStream.firstPostId,
        });
        break;
      }
      case "reassign-self": {
        this.set("topic.assigned_to_user", null);
        this.set("topic.assigned_to_group", null);

        await taskActions.reassignUserToTopic(this.currentUser, this.topic);

        this.appEvents.trigger("post-stream:refresh", {
          id: this.topic.postStream.firstPostId,
        });
        break;
      }
      case "reassign": {
        await taskActions.showAssignModal(this.topic, {
          targetType: "Topic",
          isAssigned: this.topic.isAssigned(),
          onSuccess: () =>
            this.appEvents.trigger("post-stream:refresh", {
              id: this.topic.postStream.firstPostId,
            }),
        });
        break;
      }
    }
  },

  noneItem() {
    const user = this.topic.assigned_to_user;
    const group = this.topic.assigned_to_group;
    const label = I18n.t("discourse_assign.unassign.title_w_ellipsis");
    const groupLabel = I18n.t("discourse_assign.unassign.title");

    if (user) {
      return {
        id: null,
        name: I18n.t("discourse_assign.reassign_modal.title"),
        label: htmlSafe(
          `${renderAvatar(user, {
            imageSize: "tiny",
            ignoreTitle: true,
          })}<span class="unassign-label">${label}</span>`
        ),
      };
    } else if (group) {
      return {
        id: null,
        name: I18n.t("discourse_assign.reassign_modal.title"),
        label: htmlSafe(
          `<span class="unassign-label">${groupLabel}</span> @${group.name}...`
        ),
      };
    }
  },
  dependentKeys: DEPENDENT_KEYS,
  classNames: ["reassign"],
  content() {
    const content = [
      {
        id: "unassign",
        name: I18n.t("discourse_assign.unassign.help", {
          username:
            this.topic.assigned_to_user?.username ||
            this.topic.assigned_to_group?.name,
        }),
        label: htmlSafe(
          `${iconHTML("user-times")} ${I18n.t(
            "discourse_assign.unassign.title"
          )}`
        ),
      },
    ];
    if (
      this.topic.isAssigned() &&
      this.topic.assigned_to_user?.username !== this.currentUser.username
    ) {
      content.push({
        id: "reassign-self",
        name: I18n.t("discourse_assign.reassign.to_self_help"),
        label: htmlSafe(
          `${iconHTML("user-plus")} ${I18n.t(
            "discourse_assign.reassign.to_self"
          )}`
        ),
      });
    }
    content.push({
      id: "reassign",
      name: I18n.t("discourse_assign.reassign.help"),
      label: htmlSafe(
        `${iconHTML("group-plus")} ${I18n.t(
          "discourse_assign.reassign.title_w_ellipsis"
        )}`
      ),
    });
    return content;
  },

  displayed() {
    return (
      this.currentUser?.can_assign &&
      !this.site.mobileView &&
      this.topic.isAssigned()
    );
  },
};
