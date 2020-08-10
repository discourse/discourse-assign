import { createWidgetFrom, queryRegistry } from "discourse/widgets/widget";
import { postUrl } from "discourse/lib/utilities";

const ICON = "user-plus";

const QuickAccessPanel = queryRegistry("quick-access-panel");

if (QuickAccessPanel) {
  createWidgetFrom(QuickAccessPanel, "quick-access-assignments", {
    buildKey: () => "quick-access-assignments",
    emptyStatePlaceholderItemKey: "choose_topic.none_found",

    showAllHref() {
      return `${this.attrs.path}/activity/assigned`;
    },

    findNewItems() {
      return this.store
        .findFiltered("topicList", {
          filter: `topics/messages-assigned/${this.currentUser.username_lower}`,
          params: {
            exclude_category_ids: [-1]
          }
        })
        .then(({ topic_list }) => {
          return topic_list.topics;
        });
    },

    itemHtml(assignedTopic) {
      return this.attach("quick-access-item", {
        icon: ICON,
        href: postUrl(
          assignedTopic.slug,
          assignedTopic.id,
          assignedTopic.last_read_post_number + 1
        ),
        escapedContent: assignedTopic.fancy_title
      });
    }
  });
}
