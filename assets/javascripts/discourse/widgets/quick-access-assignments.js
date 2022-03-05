import RawHtml from "discourse/widgets/raw-html";
import { iconHTML } from "discourse-common/lib/icon-library";
import {
  createWidget,
  createWidgetFrom,
  queryRegistry,
} from "discourse/widgets/widget";
import getURL from "discourse-common/lib/get-url";
import { postUrl } from "discourse/lib/utilities";
import { h } from "virtual-dom";
import I18n from "I18n";

const ICON = "user-plus";
const GROUP_ICON = "group-plus";

createWidget("no-quick-access-assignments", {
  html() {
    return h("div.empty-state", [
      h("span.empty-state-title", I18n.t("user.no_assignments_title")),
      h(
        "div.empty-state-body",
        new RawHtml({
          html:
            "<p>" +
            I18n.t("user.no_assignments_body", {
              preferencesUrl: getURL("/my/preferences/notifications"),
              icon: iconHTML(ICON),
            }).htmlSafe() +
            "</p>",
        })
      ),
    ]);
  },
});

const QuickAccessPanel = queryRegistry("quick-access-panel");

if (QuickAccessPanel) {
  createWidgetFrom(QuickAccessPanel, "quick-access-assignments", {
    buildKey: () => "quick-access-assignments",
    emptyStateWidget: "no-quick-access-assignments",

    showAllHref() {
      return `${this.attrs.path}/activity/assigned`;
    },

    findNewItems() {
      return this.store
        .findFiltered("topicList", {
          filter: `topics/messages-assigned/${this.currentUser.username_lower}`,
          params: {
            exclude_category_ids: [-1],
          },
        })
        .then(({ topic_list }) => {
          return topic_list.topics;
        });
    },

    itemHtml(assignedTopic) {
      return this.attach("quick-access-item", {
        icon: assignedTopic.assigned_to_group ? GROUP_ICON : ICON,
        href: postUrl(
          assignedTopic.slug,
          assignedTopic.id,
          assignedTopic.last_read_post_number + 1
        ),
        escapedContent: assignedTopic.fancy_title,
      });
    },
  });
}
