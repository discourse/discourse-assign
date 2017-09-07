function assignIfEqual(topic, data) {
  if (topic && topic.id === data.topic_id) {
    Ember.set(topic, 'assigned_to_user', data.assigned_to);
  }
}

export default Ember.Component.extend({
  didInsertElement() {
    this._super();
    this.messageBus.subscribe("/staff/topic-assignment", data => {
      let flaggedTopics = this.get('flaggedTopics');
      if (flaggedTopics) {
        flaggedTopics.forEach(ft => assignIfEqual(ft.topic, data));
      } else {
        assignIfEqual(this.get('topic'), data);
      }
    });
  },

  willDestroyElement() {
    this._super();
    this.messageBus.unsubscribe("/staff/topic-assignment");
  }
});
