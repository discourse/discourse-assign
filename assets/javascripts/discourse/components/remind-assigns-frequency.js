import Component from "@ember/component";
import I18n from "I18n";
import { inject as service } from "@ember/service";
import { action } from "@ember/object";

export default Component.extend({
  siteSettings: service(),

  get selectedFrequency() {
    const frequency = this.user.get("custom_fields.remind_assigns_frequency");
    if (
      this.availableFrequencies.map((freq) => freq.value).includes(frequency)
    ) {
      return frequency;
    }

    return this.siteSettings.remind_assigns_frequency;
  },

  get availableFrequencies() {
    const userRemindersFrequency = this.get("user.reminders_frequency");
    return userRemindersFrequency.map((freq) => {
      return {
        name: I18n.t(freq.name),
        value: freq.value,
        selected: false,
      };
    });
  },

  @action
  updateSelectedFrequency(value) {
    this.user.set("custom_fields.remind_assigns_frequency", value);
  },
});
