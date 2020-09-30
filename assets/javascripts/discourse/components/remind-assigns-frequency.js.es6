import I18n from "I18n";
import { computed } from "@ember/object";
import discourseComputed from "discourse-common/utils/decorators";

export default Ember.Component.extend({
  selectedFrequency: computed(
    "user.custom_fields.remind_assigns_frequency",
    function () {
      return (
        this.get("user.custom_fields.remind_assigns_frequency") ||
        this.get("siteSettings.remind_assigns_frequency")
      );
    }
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
