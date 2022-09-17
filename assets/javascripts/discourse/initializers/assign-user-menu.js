import { withPluginApi } from "discourse/lib/plugin-api";

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
            get id() {
              return "assign-list";
            }

            get panelComponent() {
              return "user-menu/assigns-list";
            }

            get icon() {
              return "user-plus";
            }

            get count() {
              return this.getUnreadCountForType("assigned");
            }

            get notificationTypes() {
              return ["assigned"];
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
