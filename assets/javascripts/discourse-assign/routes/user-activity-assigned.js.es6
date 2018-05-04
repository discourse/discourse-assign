import UserTopicListRoute from "discourse/routes/user-topic-list";

export default UserTopicListRoute.extend({
  userActionType: 16,
  noContentHelpKey: "discourse_assigns.no_assigns",

  model() {
    return this.store.findFiltered(
      'topicList',
      {
        filter: 'latest',
        params: { assigned: this.modelFor('user').get('username_lower') }
      }
    );
  },

  renderTemplate() {
    this.render('user-activity-assigned');
    this.render('user-topics-list', { into: 'user-activity-assigned' });
  },

  setupController(controller, model) {
    this._super(controller, model);
    controller.set('model', model);
  },

  actions: {
    unassignedAll() {
      this.refresh();
    }
  }
});
