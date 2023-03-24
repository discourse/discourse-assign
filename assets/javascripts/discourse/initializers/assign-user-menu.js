import { withPluginApi } from "discourse/lib/plugin-api";
import UserMenuAssignNotificationsList from "../components/user-menu/assigns-list";

export default {
  name: "assign-user-menu",

  initialize(container) {
    withPluginApi("1.2.0", (api) => {
      if (api.registerUserMenuTab) {
        const siteSettings = container.lookup("service:site-settings");
        if (!siteSettings.assign_enabled) {
          return;
        }

        const currentUser = api.getCurrentUser();
        if (!currentUser?.can_assign) {
          return;
        }
        api.registerUserMenuTab((UserMenuTab) => {
          return class extends UserMenuTab {
            id = "assign-list";
            panelComponent = UserMenuAssignNotificationsList;
            icon = "user-plus";
            notificationTypes = ["assigned"];

            get count() {
              return this.getUnreadCountForType("assigned");
            }

            get linkWhenActive() {
              return `${this.currentUser.path}/activity/assigned`;
            }
          };
        });
      }
    });
  },
};
