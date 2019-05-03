import computed from "ember-addons/ember-computed-decorators";

export default Ember.Component.extend({
  @computed("user.reminders_frequency")
  translatedFrequencies() {
    return this.get("user.reminders_frequency").map(freq => {
      return {
        name: I18n.t(freq.name),
        value: freq.value
      };
    });
  },

  didInsertElement() {
    const user_frequency = this.get(
      "user.custom_fields.remind_assigns_frequency"
    );
    if (user_frequency) return;

    const global_frequency = this.get("siteSettings.remind_assigns_frequency");
    this.set("user.custom_fields.remind_assigns_frequency", global_frequency);
  }
});
