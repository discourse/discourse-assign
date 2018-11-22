import { withPluginApi } from "discourse/lib/plugin-api";
import { default as computed } from "ember-addons/ember-computed-decorators";
import { ajax } from "discourse/lib/ajax";

// should this be in API ?
import showModal from "discourse/lib/show-modal";
import { iconNode } from "discourse-common/lib/icon-library";
import { h } from "virtual-dom";
import { iconHTML } from "discourse-common/lib/icon-library";

function modifySelectKit(api) {
  api
    .modifySelectKit("topic-footer-mobile-dropdown")
    .modifyContent((context, existingContent) => {
      if (context.get("currentUser.staff")) {
        if (context.get("topic.assigned_to_user")) {
          existingContent.push({
            id: "unassign",
            icon: "user-times",
            name: I18n.t("discourse_assign.unassign.title")
          });
        } else {
          existingContent.push({
            id: "assign",
            icon: "user-plus",
            name: I18n.t("discourse_assign.assign.title")
          });
        }
      }
      return existingContent;
    })
    .onSelect((context, value) => {
      if (!context.get("currentUser.staff")) {
        return;
      }

      const topic = context.get("topic");

      if (value === "assign") {
        showModal("assign-user", {
          model: {
            topic,
            username: topic.get("assigned_to_user.username")
          }
        });
        context.set("value", null);
      } else if (value === "unassign") {
        topic.set("assigned_to_user", null);

        ajax("/assign/unassign", {
          type: "PUT",
          data: { topic_id: topic.get("id") }
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
      return `<a class='assigned-to discourse-tag simple' href='${assignedPath}'>${iconHTML(
        "user-plus"
      )}${assignedTo}</a>`;
    }
  });

  api.addUserMenuGlyph(widget => {
    if (
      widget.currentUser &&
      widget.currentUser.get("staff")
    ) {
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
      this._super();
      if (!this.get("content.id")) return;
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
