import { renderAvatar } from "discourse/helpers/user-avatar";
import { withPluginApi } from "discourse/lib/plugin-api";
import discourseComputed, { observes } from "discourse-common/utils/decorators";
import { iconHTML, iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { queryRegistry } from "discourse/widgets/widget";
import { getOwner } from "discourse-common/lib/get-owner";
import { htmlSafe } from "@ember/template";
import getURL from "discourse-common/lib/get-url";
import SearchAdvancedOptions from "discourse/components/search-advanced-options";
import TopicButtonAction, {
  addBulkButton,
} from "discourse/controllers/topic-bulk-actions";
import { inject } from "@ember/controller";
import I18n from "I18n";
import { get } from "@ember/object";

const PLUGIN_ID = "discourse-assign";

function titleForState(name) {
  if (name) {
    return I18n.t("discourse_assign.unassign.help", {
      username: name,
    });
  } else {
    return I18n.t("discourse_assign.assign.help");
  }
}

function registerTopicFooterButtons(api) {
  api.registerTopicFooterButton({
    id: "assign",
    icon() {
      const hasAssignement =
        this.get("topic.assigned_to_user") ||
        this.get("topic.assigned_to_group");
      return hasAssignement
        ? this.site.mobileView
          ? "user-times"
          : null
        : "user-plus";
    },
    priority: 250,
    translatedTitle() {
      return titleForState(
        this.get("topic.assigned_to_user.username") ||
          this.get("topic.assigned_to_group.name")
      );
    },
    translatedAriaLabel() {
      return titleForState(
        this.get("topic.assigned_to_user.username") ||
          this.get("topic.assigned_to_group.name")
      );
    },
    translatedLabel() {
      const user = this.get("topic.assigned_to_user");
      const group = this.get("topic.assigned_to_group");
      const label = I18n.t("discourse_assign.unassign.title");

      if (user) {
        if (this.site.mobileView) {
          return htmlSafe(
            `<span class="unassign-label"><span class="text">${label}</span><span class="username">${
              user.username
            }</span></span>${renderAvatar(user, {
              imageSize: "small",
              ignoreTitle: true,
            })}`
          );
        } else {
          return htmlSafe(
            `${renderAvatar(user, {
              imageSize: "tiny",
              ignoreTitle: true,
            })}<span class="unassign-label">${label}</span>`
          );
        }
      } else if (group) {
        return htmlSafe(
          `<span class="unassign-label">${label}</span> @${group.name}`
        );
      } else {
        return I18n.t("discourse_assign.assign.title");
      }
    },
    action() {
      if (!this.get("currentUser.can_assign")) {
        return;
      }

      const taskActions = getOwner(this).lookup("service:task-actions");
      const topic = this.topic;
      const assignedUser = topic.get("assigned_to_user.username");

      if (assignedUser) {
        this.set("topic.assigned_to_user", null);
        taskActions.unassign(topic.id);
      } else if (topic.assigned_to_group) {
        this.set("topic.assigned_to_group", null);
        taskActions.unassign(topic.id);
      } else {
        taskActions.assign(topic);
      }
    },
    dropdown() {
      return this.site.mobileView;
    },
    classNames: ["assign"],
    dependentKeys: [
      "topic.assigned_to_user",
      "topic.assigned_to_group",
      "currentUser.can_assign",
      "topic.assigned_to_user.username",
    ],
    displayed() {
      return this.currentUser && this.currentUser.can_assign;
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
  }

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

  api.modifyClass("model:topic", {
    pluginId: PLUGIN_ID,

    @discourseComputed("assigned_to_user")
    assignedToUserPath(assignedToUser) {
      return getURL(
        siteSettings.assigns_user_url_path.replace(
          "{username}",
          assignedToUser.username
        )
      );
    },
    @discourseComputed("assigned_to_group")
    assignedToGroupPath(assignedToGroup) {
      return getURL(`/g/${assignedToGroup.name}/assigned/everyone`);
    },
  });

  api.modifyClass("model:bookmark", {
    pluginId: PLUGIN_ID,

    @discourseComputed("assigned_to_user")
    assignedToUserPath(assignedToUser) {
      return getURL(
        this.siteSettings.assigns_user_url_path.replace(
          "{username}",
          assignedToUser.username
        )
      );
    },
    @discourseComputed("assigned_to_group")
    assignedToGroupPath(assignedToGroup) {
      return getURL(`/g/${assignedToGroup.name}/assigned/everyone`);
    },
  });

  api.addPostSmallActionIcon("assigned", "user-plus");
  api.addPostSmallActionIcon("assigned_group", "group-plus");
  api.addPostSmallActionIcon("unassigned", "user-times");
  api.addPostSmallActionIcon("unassigned_group", "group-times");

  api.addPostTransformCallback((transformed) => {
    if (
      ["assigned", "unassigned", "assigned_group", "unassigned_group"].includes(
        transformed.actionCode
      )
    ) {
      transformed.isSmallAction = true;
      transformed.canEdit = false;
    }
  });

  api.addDiscoveryQueryParam("assigned", { replace: true, refreshModel: true });

  api.addTagsHtmlCallback((topic, params = {}) => {
    const assignedToUser = topic.get("assigned_to_user.username");
    const assignedToGroup = topic.get("assigned_to_group.name");
    if (assignedToUser || assignedToGroup) {
      const assignedPath = assignedToUser
        ? topic.assignedToUserPath
        : topic.assignedToGroupPath;
      const tagName = params.tagName || "a";
      const icon = assignedToUser
        ? iconHTML("user-plus")
        : iconHTML("group-plus");
      const href =
        tagName === "a" ? `href="${assignedPath}" data-auto-route="true"` : "";
      return `<${tagName} class="assigned-to discourse-tag simple" ${href}>
        ${icon}
        <span>${assignedToUser || assignedToGroup}</span>
      </${tagName}>`;
    }
  });

  api.addUserMenuGlyph((widget) => {
    if (widget.currentUser && widget.currentUser.can_assign) {
      const glyph = {
        label: "discourse_assign.assigned",
        className: "assigned",
        icon: "user-plus",
        href: `${widget.currentUser.path}/activity/assigned`,
      };

      if (queryRegistry("quick-access-panel")) {
        glyph["action"] = "quickAccess";
        glyph["actionParam"] = "assignments";
      }

      return glyph;
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

  api.modifyClass("controller:topic", {
    pluginId: PLUGIN_ID,

    subscribe() {
      this._super(...arguments);

      this.messageBus.subscribe("/staff/topic-assignment", (data) => {
        const topic = this.model;
        const topicId = topic.id;

        if (data.topic_id === topicId) {
          if (data.assigned_type === "User") {
            topic.set(
              "assigned_to_user_id",
              data.type === "assigned" ? data.assigned_to.id : null
            );
            topic.set("assigned_to_user", data.assigned_to);
          }
          if (data.assigned_type === "Group") {
            topic.set(
              "assigned_to_group_id",
              data.type === "assigned" ? data.assigned_to.id : null
            );
            topic.set("assigned_to_group", data.assigned_to);
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
    if (dec.attrs.post_number === 1) {
      const postModel = dec.getModel();
      if (postModel) {
        const assignedToUser = get(postModel, "topic.assigned_to_user");
        const assignedToGroup = get(postModel, "topic.assigned_to_group");
        if (assignedToUser || assignedToGroup) {
          return dec.widget.attach("assigned-to", {
            assignedToUser,
            assignedToGroup,
            href: assignedToUser
              ? get(postModel, "topic.assignedToUserPath")
              : get(postModel, "topic.assignedToGroupPath"),
          });
        }
      }
    }
  });

  api.replaceIcon(
    "notification.discourse_assign.assign_notification",
    "user-plus"
  );

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
    if (currentUser && currentUser.can_assign) {
      SearchAdvancedOptions.reopen({
        _init() {
          this._super();

          this.set("searchedTerms.assigned", "");
        },

        @observes("searchedTerms.assigned")
        updateSearchTermForAssignedUsername() {
          const match = this.filterBlocks(REGEXP_USERNAME_PREFIX);
          const userFilter = this.get("searchedTerms.assigned");
          let searchTerm = this.searchTerm || "";
          let keyword = "assigned";
          if (userFilter && userFilter.length !== 0) {
            if (match.length !== 0) {
              searchTerm = searchTerm.replace(
                match[0],
                `${keyword}:${userFilter}`
              );
            } else {
              searchTerm += ` ${keyword}:${userFilter}`;
            }

            this.set("searchTerm", searchTerm.trim());
          } else if (match.length !== 0) {
            searchTerm = searchTerm.replace(match[0], "");
            this.set("searchTerm", searchTerm.trim());
          }
        },

        _update() {
          this._super(...arguments);
          this.setSearchedTermValue(
            "searchedTerms.assigned",
            REGEXP_USERNAME_PREFIX
          );
        },
      });

      TopicButtonAction.reopen({
        assignUser: inject("assign-user"),
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

    withPluginApi("0.11.0", (api) => initialize(api));
    withPluginApi("0.8.28", (api) => registerTopicFooterButtons(api));

    withPluginApi("0.11.7", (api) => {
      api.addSearchSuggestion("in:assigned");
      api.addSearchSuggestion("in:unassigned");
    });

    withPluginApi("0.12.2", (api) => {
      api.addGroupPostSmallActionCode("assigned_group");
      api.addGroupPostSmallActionCode("unassigned_group");
    });
  },
};
