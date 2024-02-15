import { withPluginApi } from "discourse/lib/plugin-api";
import I18n from "I18n";

export default {
  name: "assign-extend-user-messages",

  initialize(container) {
    withPluginApi("1.5.0", (api) => {
      const currentUser = container.lookup("service:current-user");

      if (currentUser?.can_assign && api.addUserMessagesNavigationDropdownRow) {
        api.addUserMessagesNavigationDropdownRow(
          "userPrivateMessages.assigned",
          I18n.t("discourse_assign.assigned"),
          "user-plus"
        );
      }
    });
  },
};
