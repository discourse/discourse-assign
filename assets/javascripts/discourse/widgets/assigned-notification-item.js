import { iconNode } from "discourse-common/lib/icon-library";
import { DefaultNotificationItem } from "discourse/widgets/default-notification-item";
import { createWidgetFrom } from "discourse/widgets/widget";

createWidgetFrom(DefaultNotificationItem, "assigned-notification-item", {
  icon(notificationName, data) {
    if (data.message === "discourse_assign.assign_group_notification") {
      return iconNode(
        `notification.discourse_assign.assign_group_notification`
      );
    }

    return iconNode(`notification.${notificationName}`);
  },
});
