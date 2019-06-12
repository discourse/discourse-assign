import { withPluginApi } from "discourse/lib/plugin-api";
import { default as computed } from "ember-addons/ember-computed-decorators";
import { ajax } from "discourse/lib/ajax";

// should this be in API ?
import showModal from "discourse/lib/show-modal";
import { iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { iconHTML } from "discourse-common/lib/icon-library";

// TODO: This has to be removed when 2.3 becomes the new stable version.
import { ListItemDefaults } from "discourse/components/topic-list-item";

const ACTION_ID = "assign";

function modifySelectKit(api) {
  api
    .modifySelectKit("topic-footer-mobile-dropdown")
    .modifyContent((context, existingContent) => {
      if (context.get("currentUser.can_assign")) {
        const hasAssignement = context.get("topic.assigned_to_user");
        const button = {
          id: ACTION_ID,
          icon: hasAssignement ? "user-times" : "user-plus",
          name: I18n.t(
            `discourse_assign.${hasAssignement ? "unassign" : "assign"}.title`
          )
        };
        existingContent.push(button);
      }
      return existingContent;
    })
    .onSelect((context, value) => {
      if (!context.get("currentUser.can_assign") || value !== ACTION_ID) {
        return;
      }

      const topic = context.get("topic");
      const assignedUser = topic.get("assigned_to_user.username");

      if (assignedUser) {
        ajax("/assign/unassign", {
          type: "PUT",
          data: { topic_id: topic.get("id") }
        })
          .then(result => {
            if (result.success && result.success === "OK") {
              topic.set("assigned_to_user", null);
            }
          })
          .finally(() => context._compute());
      } else {
        showModal("assign-user", {
          model: {
            topic,
            username: topic.get("assigned_to_user.username"),
            onClose: assignedToUser => {
              topic.set("assigned_to_user", assignedToUser);
              context._compute();
            }
          }
        });
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

        return this.get("actableFilter");
      },

      didInsertElement() {
        this._super();
        this.messageBus.subscribe("/staff/topic-assignment", data => {
          let flaggedPost = this.get("flaggedPost");
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
        this._super();
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
      const assignedPath = topic.get("assignedToUserPath");
      let assignLabels = `<a data-auto-route='true' class='assigned-to discourse-tag simple' href='${assignedPath}'>${iconHTML(
        "user-plus"
      )}${assignedTo}</a>`;

      if (
        ListItemDefaults === undefined &&
        topic.get("archetype") === "private_message"
      ) {
        assignLabels += `<div>${iconHTML("envelope")} Message</div>`;
      }

      return assignLabels;
    }
  });

  api.addUserMenuGlyph(widget => {
    if (widget.currentUser && widget.currentUser.get("can_assign")) {
      return {
        label: "discourse_assign.assigned",
        className: "assigned",
        icon: "user-plus",
        href: `${widget.currentUser.get("path")}/activity/assigned`
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
      this._super();
      this.messageBus.subscribe("/staff/topic-assignment", data => {
        const topic = this.get("model");
        const topicId = topic.get("id");

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
        this.get("saveAttrNames").push("custom_fields");
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
    withPluginApi("0.8.13", api => modifySelectKit(api, container));
  }
};
