import { withPluginApi } from "discourse/lib/plugin-api";
import { default as computed } from "ember-addons/ember-computed-decorators";
import { iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { iconHTML } from "discourse-common/lib/icon-library";

// TODO: This has to be removed when 2.3 becomes the new stable version.
import { ListItemDefaults } from "discourse/components/topic-list-item";
import { getOwner } from "discourse-common/lib/get-owner";

function registerTopicFooterButtons(api) {
  api.registerTopicFooterButton({
    id: "assign",
    icon() {
      const hasAssignement = this.get("topic.assigned_to_user");
      return hasAssignement ? "user-times" : "user-plus";
    },
    priority: 250,
    title() {
      const hasAssignement = this.get("topic.assigned_to_user");
      return `discourse_assign.${hasAssignement ? "unassign" : "assign"}.help`;
    },
    label() {
      const hasAssignement = this.get("topic.assigned_to_user");
      return `discourse_assign.${hasAssignement ? "unassign" : "assign"}.title`;
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
      return this.site.mobileView && !this.get("topic.isPrivateMessage");
    },
    classNames: ["assign"],
    dependentKeys: [
      "topic.isPrivateMessage",
      "topic.assigned_to_user",
      "currentUser.can_assign",
      "topic.assigned_to_user.username"
    ],
    displayed() {
      return this.currentUser && this.currentUser.can_assign;
    }
  });
}

function initialize(api) {
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

        this.messageBus.subscribe("/staff/topic-assignment", data => {
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
      }
    },
    { ignoreMissing: true }
  );

  api.modifyClass("model:topic", {
    @computed("assigned_to_user")
    assignedToUserPath(assignedToUser) {
      return this.siteSettings.assigns_user_url_path.replace(
        "{username}",
        Ember.get(assignedToUser, "username")
      );
    }
  });

  api.addPostSmallActionIcon("assigned", "user-plus");
  api.addPostSmallActionIcon("unassigned", "user-times");

  api.addPostTransformCallback(transformed => {
    if (
      transformed.actionCode === "assigned" ||
      transformed.actionCode === "unassigned"
    ) {
      transformed.isSmallAction = true;
      transformed.canEdit = false;
    }
  });

  api.addDiscoveryQueryParam("assigned", { replace: true, refreshModel: true });

  api.addTagsHtmlCallback(topic => {
    const assignedTo = topic.get("assigned_to_user.username");
    if (assignedTo) {
      const assignedPath = topic.assignedToUserPath;
      let assignLabels = `<a data-auto-route='true' class='assigned-to discourse-tag simple' href='${assignedPath}'>${iconHTML(
        "user-plus"
      )}${assignedTo}</a>`;

      if (
        ListItemDefaults === undefined &&
        topic.archetype === "private_message"
      ) {
        assignLabels += `<div>${iconHTML("envelope")} Message</div>`;
      }

      return assignLabels;
    }
  });

  api.addUserMenuGlyph(widget => {
    if (widget.currentUser && widget.currentUser.can_assign) {
      return {
        label: "discourse_assign.assigned",
        className: "assigned",
        icon: "user-plus",
        href: `${widget.currentUser.path}/activity/assigned`,
        action: "quickAccess",
        actionParam: "assignments"
      };
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
        )
      ]);
    }
  });

  api.modifyClass("controller:topic", {
    subscribe() {
      this._super(...arguments);

      this.messageBus.subscribe("/staff/topic-assignment", data => {
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
    }
  });

  api.decorateWidget("post-contents:after-cooked", dec => {
    if (dec.attrs.post_number === 1) {
      const postModel = dec.getModel();
      if (postModel) {
        const assignedToUser = postModel.get("topic.assigned_to_user");
        if (assignedToUser) {
          return dec.widget.attach("assigned-to", {
            assignedToUser,
            href: postModel.get("topic.assignedToUserPath")
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
      }
    }
  });
}

export default {
  name: "extend-for-assign",
  initialize(container) {
    const siteSettings = container.lookup("site-settings:main");
    if (!siteSettings.assign_enabled) {
      return;
    }

    withPluginApi("0.8.11", api => initialize(api, container));
    withPluginApi("0.8.28", api => registerTopicFooterButtons(api, container));
  }
};
