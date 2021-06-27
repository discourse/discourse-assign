import Component from "@ember/component";
import I18n from "I18n";
import { or } from "@ember/object/computed";
import discourseComputed from "discourse-common/utils/decorators";

export default Component.extend({
  selectedFrequency: or(
    "user.custom_fields.remind_assigns_frequency",
    "siteSettings.remind_assigns_frequency"
  ),

  @discourseComputed("user.reminders_frequency")
  availableFrequencies(userRemindersFrequency) {
    return userRemindersFrequency.map((freq) => {
      return {
        name: I18n.t(freq.name),
        value: freq.value,
        selected: false,
      };
    });
  },
});
