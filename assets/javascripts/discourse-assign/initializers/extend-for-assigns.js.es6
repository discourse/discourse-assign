import { renderAvatar } from "discourse/helpers/user-avatar";
import { withPluginApi } from "discourse/lib/plugin-api";
import computed from "discourse-common/utils/decorators";
import { observes } from "discourse-common/utils/decorators";
import { iconHTML, iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { queryRegistry } from "discourse/widgets/widget";
import { getOwner } from "discourse-common/lib/get-owner";
import { htmlSafe } from "@ember/template";
import getURL from "discourse-common/lib/get-url";
import SearchAdvancedOptions from "discourse/components/search-advanced-options";
import I18n from "I18n";

function titleForState(user) {
  if (user) {
    return I18n.t("discourse_assign.unassign.help", {
      username: user.username,
    });
  } else {
    return I18n.t("discourse_assign.assign.help");
  }
}

function registerTopicFooterButtons(api) {
  api.registerTopicFooterButton({
    id: "assign",
    icon() {
      const hasAssignement = this.get("topic.assigned_to_user");
      return hasAssignement
        ? this.site.mobileView
          ? "user-times"
          : null
        : "user-plus";
    },
    priority: 250,
    translatedTitle() {
      return titleForState(this.get("topic.assigned_to_user"));
    },
    translatedAriaLabel() {
      return titleForState(this.get("topic.assigned_to_user"));
    },
    translatedLabel() {
      const user = this.get("topic.assigned_to_user");

      if (user) {
        const label = I18n.t("discourse_assign.unassign.title");

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
      "currentUser.can_assign",
      "topic.assigned_to_user.username",
    ],
    displayed() {
      return this.currentUser && this.currentUser.can_assign;
    },
  });
}

function initialize(api) {
  api.addNavigationBarItem({
    name: "unassigned",
    customFilter: (category) => {
      return category && category.enable_unassigned_filter;
    },
    customHref: (category) => {
      if (category) {
        return getURL(category.url) + "/l/latest?status=open&assigned=nobody";
      }
    },
    forceActive: (category, args, router) => {
      const queryParams = router.currentRoute.queryParams;

      return (
        queryParams &&
        Object.keys(queryParams).length === 2 &&
        queryParams["assigned"] === "nobody" &&
        queryParams["status"] === "open"
      );
    },
    before: "top",
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

  // You can't act on flags claimed by another user
  api.modifyClass(
    "component:flagged-post",
    {
      @computed("flaggedPost.topic.assigned_to_user_id")
      canAct(assignedToUserId) {
        let { siteSettings } = this;

        if (siteSettings.assign_locks_flags) {
          let unassigned = this.currentUser.id !== assignedToUserId;

          // Can never act on another user's flags
          if (assignedToUserId && unassigned) {
            return false;
          }

          // If flags require assignment
          if (this.siteSettings.flags_require_assign && unassigned) {
            return false;
          }
        }

        return this.actableFilter;
      },

      didInsertElement() {
        this._super(...arguments);

        this.messageBus.subscribe("/staff/topic-assignment", (data) => {
          let flaggedPost = this.flaggedPost;
          if (data.topic_id === flaggedPost.get("topic.id")) {
            flaggedPost.set(
              "topic.assigned_to_user_id",
              data.type === "assigned" ? data.assigned_to.id : null
            );
            flaggedPost.set("topic.assigned_to_user", data.assigned_to);
          }
        });
      },

      willDestroyElement() {
        this._super(...arguments);

        this.messageBus.unsubscribe("/staff/topic-assignment");
      },
    },
    { ignoreMissing: true }
  );

  api.modifyClass("model:topic", {
    @computed("assigned_to_user")
    assignedToUserPath(assignedToUser) {
      const siteSettings = api.container.lookup("site-settings:main");
      return getURL(
        siteSettings.assigns_user_url_path.replace(
          "{username}",
          assignedToUser.username
        )
      );
    },
  });

  api.modifyClass("model:bookmark", {
    @computed("assigned_to_user")
    assignedToUserPath(assignedToUser) {
      return getURL(
        this.siteSettings.assigns_user_url_path.replace(
          "{username}",
          assignedToUser.username
        )
      );
    },
  });

  api.addPostSmallActionIcon("assigned", "user-plus");
  api.addPostSmallActionIcon("unassigned", "user-times");

  api.addPostTransformCallback((transformed) => {
    if (
      transformed.actionCode === "assigned" ||
      transformed.actionCode === "unassigned"
    ) {
      transformed.isSmallAction = true;
      transformed.canEdit = false;
    }
  });

  api.addDiscoveryQueryParam("assigned", { replace: true, refreshModel: true });

  api.addTagsHtmlCallback((topic) => {
    const assignedTo = topic.get("assigned_to_user.username");
    if (assignedTo) {
      const assignedPath = topic.assignedToUserPath;
      return `<a data-auto-route='true' class='assigned-to discourse-tag simple' href='${assignedPath}'>${iconHTML(
        "user-plus"
      )}${assignedTo}</a>`;
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
      let { assignedToUser, href } = attrs;

      return h("p.assigned-to", [
        iconNode("user-plus"),
        h("span.assign-text", I18n.t("discourse_assign.assigned_to")),
        h(
          "a",
          { attributes: { class: "assigned-to-username", href } },
          assignedToUser.username
        ),
      ]);
    },
  });

  api.modifyClass("controller:topic", {
    subscribe() {
      this._super(...arguments);

      this.messageBus.subscribe("/staff/topic-assignment", (data) => {
        const topic = this.model;
        const topicId = topic.id;

        if (data.topic_id === topicId) {
          topic.set(
            "assigned_to_user_id",
            data.type === "assigned" ? data.assigned_to.id : null
          );
          topic.set("assigned_to_user", data.assigned_to);
        }
        this.appEvents.trigger("header:update-topic", topic);
      });
    },

    unsubscribe() {
      this._super(...arguments);

      if (!this.get("model.id")) return;

      this.messageBus.unsubscribe("/staff/topic-assignment");
    },
  });

  api.decorateWidget("post-contents:after-cooked", (dec) => {
    if (dec.attrs.post_number === 1) {
      const postModel = dec.getModel();
      if (postModel) {
        const assignedToUser = Ember.get(postModel, "topic.assigned_to_user");
        if (assignedToUser) {
          return dec.widget.attach("assigned-to", {
            assignedToUser,
            href: Ember.get(postModel, "topic.assignedToUserPath"),
          });
        }
      }
    }
  });

  api.replaceIcon(
    "notification.discourse_assign.assign_notification",
    "user-plus"
  );

  api.modifyClass("controller:preferences/notifications", {
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
    if (currentUser.can_assign) {
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
    }

    withPluginApi("0.11.0", (api) => initialize(api, container));
    withPluginApi("0.8.28", (api) =>
      registerTopicFooterButtons(api, container)
    );
  },
};
