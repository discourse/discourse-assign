import Component from "@ember/component";
import { set } from "@ember/object";

function assignIfEqual(topic, data) {
  if (topic && topic.id === data.topic_id) {
    set(topic, "assigned_to_user", data.assigned_to);
  }
}

export default Component.extend({
  didInsertElement() {
    this._super();
    this.messageBus.subscribe("/staff/topic-assignment", (data) => {
      let flaggedTopics = this.flaggedTopics;
      if (flaggedTopics) {
        flaggedTopics.forEach((ft) => assignIfEqual(ft.topic, data));
      } else {
        assignIfEqual(this.topic, data);
      }
    });
  },

  willDestroyElement() {
    this._super();
    this.messageBus.unsubscribe("/staff/topic-assignment");
  },
});
