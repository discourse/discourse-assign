import { withPluginApi } from "discourse/lib/plugin-api";
import I18n from "I18n";

export default {
  name: "assign-sidebar",

  initialize(container) {
    withPluginApi("1.2.0", (api) => {
      const currentUser = container.lookup("current-user:main");

      if (
        currentUser?.experimental_sidebar_enabled &&
        currentUser?.can_assign
      ) {
        api.addTopicsSectionLink((baseSectionLink) => {
          return class AssignedSectionLink extends baseSectionLink {
            get name() {
              return "assigned";
            }

            get route() {
              return "userActivity.assigned";
            }

            get model() {
              return this.currentUser;
            }

            get title() {
              return I18n.t("sidebar.assigned_link_title");
            }

            get text() {
              return I18n.t("sidebar.assigned_link_text");
            }
          };
        });
      }
    });
  },
};
