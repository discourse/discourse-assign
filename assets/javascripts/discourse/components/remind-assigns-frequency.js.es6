import computed from "ember-addons/ember-computed-decorators";

export default Ember.Component.extend({
  selectedFrequency: null,

  @computed("user.reminders_frequency")
  availableFrequencies() {
    return this.get("user.reminders_frequency").map(freq => {
      return {
        name: I18n.t(freq.name),
        value: freq.value,
        selected: false
      };
    });
  },

  didInsertElement() {
    let current_frequency = this.get(
      "user.custom_fields.remind_assigns_frequency"
    );

    if (current_frequency === undefined) {
      current_frequency = this.get("siteSettings.remind_assigns_frequency");
    }

    this.set("selectedFrequency", current_frequency);
  },

  actions: {
    setFrequency(newFrequency) {
      this.set("user.custom_fields.remind_assigns_frequency", newFrequency);
    }
  }
});
