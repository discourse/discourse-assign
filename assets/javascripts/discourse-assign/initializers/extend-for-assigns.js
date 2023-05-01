import { renderAvatar } from "discourse/helpers/user-avatar";
import { withPluginApi } from "discourse/lib/plugin-api";
import discourseComputed from "discourse-common/utils/decorators";
import { iconHTML, iconNode } from "discourse-common/lib/icon-library";
import { escapeExpression } from "discourse/lib/utilities";
import { h } from "virtual-dom";
import { queryRegistry } from "discourse/widgets/widget";
import { getOwner } from "discourse-common/lib/get-owner";
import { htmlSafe } from "@ember/template";
import getURL from "discourse-common/lib/get-url";
import SearchAdvancedOptions from "discourse/components/search-advanced-options";
import TopicButtonAction, {
  addBulkButton,
} from "discourse/controllers/topic-bulk-actions";
import { inject as controller } from "@ember/controller";
import I18n from "I18n";
import { isEmpty } from "@ember/utils";
import { registerTopicFooterDropdown } from "discourse/lib/register-topic-footer-dropdown";
import RawHtml from "discourse/widgets/raw-html";

const PLUGIN_ID = "discourse-assign";

const DEPENDENT_KEYS = [
  "topic.assigned_to_user",
  "topic.assigned_to_group",
  "currentUser.can_assign",
  "topic.assigned_to_user.username",
];

function titleForState(name) {
  if (name) {
    return I18n.t("discourse_assign.unassign.help", {
      username: name,
    });
  } else {
    return I18n.t("discourse_assign.assign.help");
  }
}

function defaultTitle(topic) {
  return titleForState(
    topic.get("topic.assigned_to_user.username") ||
      topic.get("topic.assigned_to_group.name")
  );
}

function includeIsAssignedOnTopic(api) {
  api.modifyClass("model:topic", {
    pluginId: PLUGIN_ID,
    isAssigned() {
      return this.assigned_to_user || this.assigned_to_group;
    },
  });
}

function registerTopicFooterButtons(api) {
  registerTopicFooterDropdown({
    id: "reassign",

    action(id) {
      if (!this.get("currentUser.can_assign")) {
        return;
      }

      const taskActions = getOwner(this).lookup("service:task-actions");

      switch (id) {
        case "unassign": {
          this.set("topic.assigned_to_user", null);
          this.set("topic.assigned_to_group", null);
          taskActions.unassign(this.topic.id).then(() => {
            this.appEvents.trigger("post-stream:refresh", {
              id: this.topic.postStream.firstPostId,
            });
          });
          break;
        }
        case "reassign-self": {
          this.set("topic.assigned_to_user", null);
          this.set("topic.assigned_to_group", null);
          taskActions
            .reassignUserToTopic(this.currentUser, this.topic)
            .then(() => {
              this.appEvents.trigger("post-stream:refresh", {
                id: this.topic.postStream.firstPostId,
              });
            });
          break;
        }
        case "reassign": {
          taskActions
            .assign(this.topic, {
              targetType: "Topic",
              isAssigned: this.topic.isAssigned(),
            })
            .set("model.onSuccess", () => {
              this.appEvents.trigger("post-stream:refresh", {
                id: this.topic.postStream.firstPostId,
              });
            });
          break;
        }
      }
    },

    noneItem() {
      const user = this.get("topic.assigned_to_user");
      const group = this.get("topic.assigned_to_group");
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
        this.get("topic.assigned_to_user")?.username !==
          this.currentUser.username
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
        this.get("currentUser.can_assign") &&
        !this.site.mobileView &&
        this.topic.isAssigned()
      );
    },
  });

  api.registerTopicFooterButton({
    id: "assign",
    icon() {
      return this.topic.isAssigned()
        ? this.site.mobileView
          ? "user-times"
          : null
        : "user-plus";
    },
    priority: 250,
    translatedTitle() {
      return defaultTitle(this);
    },
    translatedAriaLabel() {
      return defaultTitle(this);
    },
    translatedLabel() {
      return I18n.t("discourse_assign.assign.title");
    },
    action() {
      if (!this.get("currentUser.can_assign")) {
        return;
      }

      const taskActions = getOwner(this).lookup("service:task-actions");

      if (this.topic.isAssigned()) {
        this.set("topic.assigned_to_user", null);
        this.set("topic.assigned_to_group", null);
        taskActions.unassign(this.topic.id, "Topic").then(() => {
          this.appEvents.trigger("post-stream:refresh", {
            id: this.topic.postStream.firstPostId,
          });
        });
      } else {
        taskActions.assign(this.topic).set("model.onSuccess", () => {
          this.appEvents.trigger("post-stream:refresh", {
            id: this.topic.postStream.firstPostId,
          });
        });
      }
    },
    dropdown() {
      return this.site.mobileView;
    },
    classNames: ["assign"],
    dependentKeys: DEPENDENT_KEYS,
    displayed() {
      return this.currentUser?.can_assign && !this.topic.isAssigned();
    },
  });

  api.registerTopicFooterButton({
    id: "unassign-mobile-header",
    translatedTitle() {
      return defaultTitle(this);
    },
    translatedAriaLabel() {
      return defaultTitle(this);
    },
    translatedLabel() {
      const user = this.get("topic.assigned_to_user");
      const group = this.get("topic.assigned_to_group");
      const label = I18n.t("discourse_assign.assigned_to_w_ellipsis");

      if (user) {
        return htmlSafe(
          `<span class="unassign-label"><span class="text">${label}</span><span class="username">${
            user.username
          }</span></span>${renderAvatar(user, {
            imageSize: "small",
            ignoreTitle: true,
          })}`
        );
      } else if (group) {
        return htmlSafe(
          `<span class="unassign-label">${label}</span> @${group.name}`
        );
      }
    },
    dropdown() {
      return this.currentUser?.can_assign && this.topic.isAssigned();
    },
    classNames: ["assign"],
    dependentKeys: DEPENDENT_KEYS,
    displayed() {
      // only display the button in the mobile view
      return this.currentUser?.can_assign && this.site.mobileView;
    },
  });

  api.registerTopicFooterButton({
    id: "unassign-mobile",
    icon() {
      return "user-times";
    },
    translatedTitle() {
      return defaultTitle(this);
    },
    translatedAriaLabel() {
      return defaultTitle(this);
    },
    translatedLabel() {
      const label = I18n.t("discourse_assign.unassign.title");

      return htmlSafe(
        `<span class="unassign-label"><span class="text">${label}</span></span>`
      );
    },
    action() {
      if (!this.get("currentUser.can_assign")) {
        return;
      }

      const taskActions = getOwner(this).lookup("service:task-actions");

      this.set("topic.assigned_to_user", null);
      this.set("topic.assigned_to_group", null);
      taskActions.unassign(this.topic.id).then(() => {
        this.appEvents.trigger("post-stream:refresh", {
          id: this.topic.postStream.firstPostId,
        });
      });
    },
    dropdown() {
      return this.currentUser?.can_assign && this.topic.isAssigned();
    },
    classNames: ["assign"],
    dependentKeys: DEPENDENT_KEYS,
    displayed() {
      // only display the button in the mobile view
      return (
        this.currentUser?.can_assign &&
        this.site.mobileView &&
        this.topic.isAssigned()
      );
    },
  });

  api.registerTopicFooterButton({
    id: "reassign-self-mobile",
    icon() {
      return "user-plus";
    },
    translatedTitle() {
      return I18n.t("discourse_assign.reassign.to_self_help");
    },
    translatedAriaLabel() {
      return I18n.t("discourse_assign.reassign.to_self_help");
    },
    translatedLabel() {
      const label = I18n.t("discourse_assign.reassign.to_self");

      return htmlSafe(
        `<span class="unassign-label"><span class="text">${label}</span></span>`
      );
    },
    action() {
      if (!this.get("currentUser.can_assign")) {
        return;
      }

      const taskActions = getOwner(this).lookup("service:task-actions");

      this.set("topic.assigned_to_user", null);
      this.set("topic.assigned_to_group", null);
      taskActions.reassignUserToTopic(this.currentUser, this.topic).then(() => {
        this.appEvents.trigger("post-stream:refresh", {
          id: this.topic.postStream.firstPostId,
        });
      });
    },
    dropdown() {
      return this.currentUser?.can_assign && this.topic.isAssigned();
    },
    classNames: ["assign"],
    dependentKeys: DEPENDENT_KEYS,
    displayed() {
      return (
        // only display the button in the mobile view
        this.site.mobileView &&
        this.currentUser?.can_assign &&
        this.topic.isAssigned() &&
        this.get("topic.assigned_to_user")?.username !==
          this.currentUser.username
      );
    },
  });

  api.registerTopicFooterButton({
    id: "reassign-mobile",
    icon() {
      return "group-plus";
    },
    translatedTitle() {
      return I18n.t("discourse_assign.reassign.help");
    },
    translatedAriaLabel() {
      return I18n.t("discourse_assign.reassign.help");
    },
    translatedLabel() {
      const label = I18n.t("discourse_assign.reassign.title_w_ellipsis");

      return htmlSafe(
        `<span class="unassign-label"><span class="text">${label}</span></span>`
      );
    },
    action() {
      if (!this.get("currentUser.can_assign")) {
        return;
      }

      const taskActions = getOwner(this).lookup("service:task-actions");

      taskActions
        .assign(this.topic, {
          targetType: "Topic",
          isAssigned: this.topic.isAssigned(),
        })
        .set("model.onSuccess", () => {
          this.appEvents.trigger("post-stream:refresh", {
            id: this.topic.postStream.firstPostId,
          });
        });
    },
    dropdown() {
      return this.currentUser?.can_assign && this.topic.isAssigned();
    },
    classNames: ["assign"],
    dependentKeys: DEPENDENT_KEYS,
    displayed() {
      // only display the button in the mobile view
      return this.currentUser?.can_assign && this.site.mobileView;
    },
  });
}

function initialize(api) {
  const siteSettings = api.container.lookup("site-settings:main");
  const currentUser = api.getCurrentUser();

  if (siteSettings.assigns_public || currentUser?.can_assign) {
    api.addNavigationBarItem({
      name: "unassigned",
      customFilter: (category) => {
        return category?.custom_fields?.enable_unassigned_filter === "true";
      },
      customHref: (category) => {
        if (category) {
          return getURL(category.url) + "/l/latest?status=open&assigned=nobody";
        }
      },
      forceActive: (category, args) => {
        const queryParams = args.currentRouteQueryParams;

        return (
          queryParams &&
          Object.keys(queryParams).length === 2 &&
          queryParams["assigned"] === "nobody" &&
          queryParams["status"] === "open"
        );
      },
      before: "top",
    });
    if (api.getCurrentUser() && api.getCurrentUser().can_assign) {
      api.addPostMenuButton("assign", (post) => {
        if (post.firstPost) {
          return;
        }
        if (post.assigned_to_user || post.assigned_to_group) {
          return {
            action: "unassignPost",
            icon: "user-times",
            className: "unassign-post",
            title: "discourse_assign.unassign_post.title",
            position:
              post.assigned_to_user?.id === api.getCurrentUser().id
                ? "first"
                : "second-last-hidden",
          };
        } else {
          return {
            action: "assignPost",
            icon: "user-plus",
            className: "assign-post",
            title: "discourse_assign.assign_post.title",
            position: "second-last-hidden",
          };
        }
      });
      api.attachWidgetAction("post", "assignPost", function () {
        const taskActions = getOwner(this).lookup("service:task-actions");
        taskActions.assign(this.model, {
          isAssigned: false,
          targetType: "Post",
        });
      });
      api.attachWidgetAction("post", "unassignPost", function () {
        const taskActions = getOwner(this).lookup("service:task-actions");
        taskActions.unassign(this.model.id, "Post").then(() => {
          delete this.model.topic.indirectly_assigned_to[this.model.id];
        });
      });
    }
  }

  api.addPostSmallActionClassesCallback((post) => {
    if (post.actionCode.includes("assigned") && !siteSettings.assigns_public) {
      return ["private-assign"];
    }
  });

  api.addAdvancedSearchOptions(
    api.getCurrentUser() && api.getCurrentUser().can_assign
      ? {
          inOptionsForUsers: [
            {
              name: I18n.t("search.advanced.in.assigned"),
              value: "assigned",
            },
            {
              name: I18n.t("search.advanced.in.unassigned"),
              value: "unassigned",
            },
          ],
        }
      : {}
  );

  function assignedToUserPath(assignedToUser) {
    return getURL(
      siteSettings.assigns_user_url_path.replace(
        "{username}",
        assignedToUser.username
      )
    );
  }

  function assignedToGroupPath(assignedToGroup) {
    return getURL(`/g/${assignedToGroup.name}/assigned/everyone`);
  }

  api.modifyClass("model:bookmark", {
    pluginId: PLUGIN_ID,

    @discourseComputed("assigned_to_user")
    assignedToUserPath(assignedToUser) {
      return assignedToUserPath(assignedToUser);
    },
    @discourseComputed("assigned_to_group")
    assignedToGroupPath(assignedToGroup) {
      return assignedToGroupPath(assignedToGroup);
    },
  });

  api.modifyClass("component:topic-notifications-button", {
    pluginId: PLUGIN_ID,

    @discourseComputed(
      "topic",
      "topic.details.{notification_level,notifications_reason_id}"
    )
    notificationReasonText(topic) {
      if (
        this.currentUser.never_auto_track_topics &&
        topic.assigned_to_user &&
        topic.assigned_to_user.username === this.currentUser.username
      ) {
        return I18n.t("notification_reason.user");
      }

      return this._super(...arguments);
    },
  });

  api.addPostSmallActionIcon("assigned", "user-plus");
  api.addPostSmallActionIcon("assigned_to_post", "user-plus");
  api.addPostSmallActionIcon("assigned_group", "group-plus");
  api.addPostSmallActionIcon("assigned_group_to_post", "group-plus");
  api.addPostSmallActionIcon("unassigned", "user-times");
  api.addPostSmallActionIcon("unassigned_group", "group-times");
  api.addPostSmallActionIcon("unassigned_from_post", "user-times");
  api.addPostSmallActionIcon("unassigned_group_from_post", "group-times");
  api.includePostAttributes("assigned_to_user", "assigned_to_group");
  api.addPostSmallActionIcon("reassigned", "user-plus");
  api.addPostSmallActionIcon("reassigned_group", "group-plus");

  api.addPostTransformCallback((transformed) => {
    if (
      [
        "assigned",
        "unassigned",
        "reassigned",
        "assigned_group",
        "unassigned_group",
        "reassigned_group",
        "assigned_to_post",
        "assigned_group_to_post",
        "unassigned_from_post",
        "unassigned_group_from_post",
        "details_change",
        "note_change",
        "status_change",
      ].includes(transformed.actionCode)
    ) {
      transformed.isSmallAction = true;
      transformed.canEdit = true;
    }
  });

  api.addDiscoveryQueryParam("assigned", { replace: true, refreshModel: true });

  api.addTagsHtmlCallback((topic, params = {}) => {
    const [assignedToUser, assignedToGroup, topicNote] = Object.values(
      topic.getProperties(
        "assigned_to_user",
        "assigned_to_group",
        "assignment_note",
        "assignment_status"
      )
    );

    const topicAssignee = {
      assignee: assignedToUser || assignedToGroup,
      note: topicNote,
    };

    let assignedToIndirectly;
    if (topic.get("indirectly_assigned_to")) {
      assignedToIndirectly = Object.entries(
        topic.get("indirectly_assigned_to")
      ).map(([key, value]) => {
        value.assigned_to.assignedToPostId = key;
        return value;
      });
    } else {
      assignedToIndirectly = [];
    }
    const assignedTo = []
      .concat(
        topicAssignee,
        assignedToIndirectly.map((assigned) => ({
          assignee: assigned.assigned_to,
          status: assigned.assignment_status,
          note: assigned.assignment_note,
        }))
      )
      .filter(({ assignee }) => assignee)
      .flat();

    if (assignedTo) {
      return assignedTo
        .map(({ assignee, note }) => {
          let assignedPath;
          if (assignee.assignedToPostId) {
            assignedPath = `/p/${assignee.assignedToPostId}`;
          } else {
            assignedPath = `/t/${topic.id}`;
          }
          const icon = iconHTML(assignee.assign_icon);
          const name = assignee.username || assignee.name;
          const tagName = params.tagName || "a";
          const href =
            tagName === "a"
              ? `href="${getURL(assignedPath)}" data-auto-route="true"`
              : "";
          return `<${tagName} class="assigned-to discourse-tag simple" ${href}>${icon}<span title="${escapeExpression(
            note
          )}">${name}</span></${tagName}>`;
        })
        .join("");
    }
  });

  api.createWidget("assigned-to", {
    html(attrs) {
      let { assignedToUser, assignedToGroup, href } = attrs;

      return h("p.assigned-to", [
        assignedToUser ? iconNode("user-plus") : iconNode("group-plus"),
        h("span.assign-text", I18n.t("discourse_assign.assigned_to")),
        h(
          "a",
          { attributes: { class: "assigned-to-username", href } },
          assignedToUser ? assignedToUser.username : assignedToGroup.name
        ),
      ]);
    },
  });

  api.createWidget("assigned-to-first-post", {
    html(attrs) {
      const topic = attrs.topic;
      const [assignedToUser, assignedToGroup, indirectlyAssignedTo] = [
        topic.assigned_to_user,
        topic.assigned_to_group,
        topic.indirectly_assigned_to,
      ];
      const assigneeElements = [];

      const assignedHtml = (username, path, type) => {
        return `<span class="assigned-to--${type}">${htmlSafe(
          I18n.t("discourse_assign.assigned_topic_to", {
            username,
            path,
          })
        )}</span>`;
      };

      if (assignedToUser) {
        assigneeElements.push(
          h(
            "span.assignee",
            new RawHtml({
              html: assignedHtml(
                assignedToUser.username,
                assignedToUserPath(assignedToUser),
                "user"
              ),
            })
          )
        );
      }
      if (assignedToGroup) {
        assigneeElements.push(
          h(
            "span.assignee",
            new RawHtml({
              html: assignedHtml(
                assignedToGroup.name,
                assignedToGroupPath(assignedToGroup),
                "group"
              ),
            })
          )
        );
      }
      if (indirectlyAssignedTo) {
        Object.keys(indirectlyAssignedTo).map((postId) => {
          const assignee = indirectlyAssignedTo[postId].assigned_to;
          const postNumber = indirectlyAssignedTo[postId].post_number;
          assigneeElements.push(
            h("span.assignee", [
              h(
                "a",
                {
                  attributes: {
                    class: "assigned-indirectly",
                    href: `${topic.url}/${postNumber}`,
                  },
                },
                I18n.t("discourse_assign.assign_post_to_multiple", {
                  post_number: postNumber,
                  username: assignee.username || assignee.name,
                })
              ),
            ])
          );
        });
      }
      if (!isEmpty(assigneeElements)) {
        return h("p.assigned-to", [
          assignedToUser ? iconNode("user-plus") : iconNode("group-plus"),
          assignedToUser || assignedToGroup
            ? ""
            : h("span.assign-text", I18n.t("discourse_assign.assigned")),
          assigneeElements,
        ]);
      }
    },
  });

  api.modifyClass("model:group", {
    pluginId: PLUGIN_ID,

    asJSON() {
      return Object.assign({}, this._super(...arguments), {
        assignable_level: this.assignable_level,
      });
    },
  });

  api.modifyClass("controller:topic", {
    pluginId: PLUGIN_ID,

    subscribe() {
      this._super(...arguments);

      this.messageBus.subscribe("/staff/topic-assignment", (data) => {
        const topic = this.model;
        const topicId = topic.id;

        if (data.topic_id === topicId) {
          let post;
          if (data.post_id) {
            post = topic.postStream.posts.find((p) => p.id === data.post_id);
          }
          const target = post || topic;

          target.set("assignment_note", data.assignment_note);
          target.set("assignment_status", data.assignment_status);
          if (data.assigned_type === "User") {
            target.set(
              "assigned_to_user_id",
              data.type === "assigned" ? data.assigned_to.id : null
            );
            target.set("assigned_to_user", data.assigned_to);
          }
          if (data.assigned_type === "Group") {
            target.set(
              "assigned_to_group_id",
              data.type === "assigned" ? data.assigned_to.id : null
            );
            target.set("assigned_to_group", data.assigned_to);
          }

          if (data.post_id) {
            if (data.type === "unassigned") {
              delete topic.indirectly_assigned_to[data.post_number];
            }
            this.appEvents.trigger("post-stream:refresh", {
              id: topic.postStream.posts[0].id,
            });
            this.appEvents.trigger("post-stream:refresh", { id: data.post_id });
          }
          if (topic.closed) {
            this.appEvents.trigger("post-stream:refresh", {
              id: topic.postStream.posts[0].id,
            });
          }
        }
        this.appEvents.trigger("header:update-topic", topic);
      });
    },

    unsubscribe() {
      this._super(...arguments);

      if (!this.get("model.id")) {
        return;
      }

      this.messageBus.unsubscribe("/staff/topic-assignment");
    },
  });

  api.decorateWidget("post-contents:after-cooked", (dec) => {
    const postModel = dec.getModel();
    if (postModel) {
      let assignedToUser, assignedToGroup, postAssignment, href;
      if (dec.attrs.post_number === 1) {
        return dec.widget.attach("assigned-to-first-post", {
          topic: postModel.topic,
        });
      } else {
        postAssignment =
          postModel.topic.indirectly_assigned_to?.[postModel.id]?.assigned_to;
        if (postAssignment?.username) {
          assignedToUser = postAssignment;
        }
        if (postAssignment?.name) {
          assignedToGroup = postAssignment;
        }
      }
      if (assignedToUser || assignedToGroup) {
        href = assignedToUser
          ? assignedToUserPath(assignedToUser)
          : assignedToGroupPath(assignedToGroup);
      }
      if (href) {
        return dec.widget.attach("assigned-to", {
          assignedToUser,
          assignedToGroup,
          href,
        });
      }
    }
  });

  api.replaceIcon("notification.assigned", "user-plus");

  api.replaceIcon(
    "notification.discourse_assign.assign_group_notification",
    "group-plus"
  );

  api.modifyClass("controller:preferences/notifications", {
    pluginId: PLUGIN_ID,

    actions: {
      save() {
        this.saveAttrNames.push("custom_fields");
        this._super(...arguments);
      },
    },
  });

  api.addKeyboardShortcut("g a", "", { path: "/my/activity/assigned" });
}

const REGEXP_USERNAME_PREFIX = /^(assigned:)/gi;

export default {
  name: "extend-for-assign",

  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    if (!siteSettings.assign_enabled) {
      return;
    }

    const currentUser = container.lookup("current-user:main");
    if (currentUser?.can_assign) {
      SearchAdvancedOptions.reopen({
        updateSearchTermForAssignedUsername() {
          const match = this.filterBlocks(REGEXP_USERNAME_PREFIX);
          const userFilter = this.get("searchedTerms.assigned");
          let searchTerm = this.searchTerm || "";
          let keyword = "assigned";

          if (userFilter?.length !== 0) {
            if (match.length !== 0) {
              searchTerm = searchTerm.replace(
                match[0],
                `${keyword}:${userFilter}`
              );
            } else {
              searchTerm += ` ${keyword}:${userFilter}`;
            }

            this._updateSearchTerm(searchTerm);
          } else if (match.length !== 0) {
            searchTerm = searchTerm.replace(match[0], "");
            this._updateSearchTerm(searchTerm);
          }
        },
      });

      TopicButtonAction.reopen({
        assignUser: controller("assign-user"),
        actions: {
          showReAssign() {
            this.set("assignUser.isBulkAction", true);
            this.set("assignUser.model", { username: "" });
            this.send("changeBulkTemplate", "modal/assign-user");
          },
          unassignTopics() {
            this.performAndRefresh({ type: "unassign" });
          },
        },
      });
      addBulkButton("showReAssign", "assign", {
        icon: "user-plus",
        class: "btn-default",
      });
      addBulkButton("unassignTopics", "unassign", {
        icon: "user-times",
        class: "btn-default",
      });
    }

    withPluginApi("0.13.0", (api) => includeIsAssignedOnTopic(api));
    withPluginApi("0.11.0", (api) => initialize(api));
    withPluginApi("0.8.28", (api) => registerTopicFooterButtons(api));

    withPluginApi("0.11.7", (api) => {
      api.addSearchSuggestion("in:assigned");
      api.addSearchSuggestion("in:unassigned");
    });

    withPluginApi("0.12.2", (api) => {
      api.addGroupPostSmallActionCode("assigned_group");
      api.addGroupPostSmallActionCode("unassigned_group");
      api.addGroupPostSmallActionCode("assigned_group_to_post");
      api.addGroupPostSmallActionCode("unassigned_group_from_post");
    });
    withPluginApi("0.12.3", (api) => {
      api.addUserSearchOption("assignableGroups");
    });
  },
};
