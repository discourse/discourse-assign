import Component from "@ember/component";
import discourseComputed from "discourse-common/utils/decorators";
import I18n from "I18n";

export default class RemindAssignsFrequency extends Component {
  @discourseComputed(
    "user.custom_fields.remind_assigns_frequency",
    "siteSettings.remind_assigns_frequency"
  )
  selectedFrequency(userAssignsFrequency, siteDefaultAssignsFrequency) {
    if (
      this.availableFrequencies
        .map((freq) => freq.value)
        .includes(userAssignsFrequency)
    ) {
      return userAssignsFrequency;
    }

    return siteDefaultAssignsFrequency;
  }

  @discourseComputed("user.reminders_frequency")
  availableFrequencies(userRemindersFrequency) {
    return userRemindersFrequency.map((freq) => ({
      name: I18n.t(freq.name),
      value: freq.value,
      selected: false,
    }));
  }
}
