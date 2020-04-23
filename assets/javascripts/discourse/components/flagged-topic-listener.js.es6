function assignIfEqual(topic, data) {
  if (topic && topic.id === data.topic_id) {
    Ember.set(topic, "assigned_to_user", data.assigned_to);
  }
}

export default Ember.Component.extend({
  didInsertElement() {
    this._super(...arguments);

    this.messageBus.subscribe("/staff/topic-assignment", data => {
      if (this.flaggedTopics) {
        this.flaggedTopics.forEach(ft => assignIfEqual(ft.topic, data));
      } else {
        assignIfEqual(this.topic, data);
      }
    });
  },

  willDestroyElement() {
    this._super(...arguments);

    this.messageBus.unsubscribe("/staff/topic-assignment");
  }
});
