import UserMenuNotificationsList from "discourse/components/user-menu/notifications-list";
import { ajax } from "discourse/lib/ajax";
import UserMenuNotificationItem from "discourse/lib/user-menu/notification-item";
import Notification from "discourse/models/notification";
import Topic from "discourse/models/topic";
import I18n from "I18n";
import UserMenuAssignItem from "../../lib/user-menu/assign-item";
import UserMenuAssignsListEmptyState from "./assigns-list-empty-state";

export default class UserMenuAssignNotificationsList extends UserMenuNotificationsList {
  get dismissTypes() {
    return this.filterByTypes;
  }

  get showDismiss() {
    return this._unreadAssignedNotificationsCount > 0;
  }

  get dismissTitle() {
    return I18n.t("user.dismiss_assigned_tooltip");
  }

  get showAllHref() {
    return `${this.currentUser.path}/activity/assigned`;
  }

  get showAllTitle() {
    return I18n.t("user_menu.view_all_assigned");
  }

  get itemsCacheKey() {
    return "user-menu-assigns-tab";
  }

  get emptyStateComponent() {
    return UserMenuAssignsListEmptyState;
  }

  get alwaysRenderDismissConfirmation() {
    return true;
  }

  get _unreadAssignedNotificationsCount() {
    const key = `grouped_unread_notifications.${this.site.notification_types.assigned}`;
    // we're retrieving the value with get() so that Ember tracks the property
    // and re-renders the UI when it changes.
    // we can stop using `get()` when the User model is refactored into native
    // class with @tracked properties.
    return this.currentUser.get(key) || 0;
  }

  get dismissConfirmationText() {
    return I18n.t("notifications.dismiss_confirmation.body.assigns", {
      count: this._unreadAssignedNotificationsCount,
    });
  }

  async fetchItems() {
    const data = await ajax("/assign/user-menu-assigns.json");
    const content = [];

    const notifications = data.notifications.map((n) => Notification.create(n));
    await Notification.applyTransformations(notifications);
    notifications.forEach((notification) => {
      content.push(
        new UserMenuNotificationItem({
          notification,
          currentUser: this.currentUser,
          siteSettings: this.siteSettings,
          site: this.site,
        })
      );
    });

    const topics = data.topics.map((t) => Topic.create(t));
    await Topic.applyTransformations(topics);
    content.push(...topics.map((assign) => new UserMenuAssignItem({ assign })));
    return content;
  }
}
