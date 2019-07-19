import computed from "ember-addons/ember-computed-decorators";

export default Ember.Component.extend({
  selectedFrequency: null,

  @computed("user.reminders_frequency")
  availableFrequencies(userRemindersFrequency) {
    return userRemindersFrequency.map(freq => {
      return {
        name: I18n.t(freq.name),
        value: freq.value,
        selected: false
      };
    });
  },

  didInsertElement() {
    this._super(...arguments);

    let currentFrequency = this.get(
      "user.custom_fields.remind_assigns_frequency"
    );

    if (currentFrequency === undefined) {
      currentFrequency = this.get("siteSettings.remind_assigns_frequency");
    }

    this.set("selectedFrequency", currentFrequency);
  },

  actions: {
    setFrequency(newFrequency) {
      this.set("user.custom_fields.remind_assigns_frequency", newFrequency);
    }
  }
});
