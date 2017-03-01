import UserTopicListRoute from "discourse/routes/user-topic-list";

export default UserTopicListRoute.extend({
  userActionType: 16,
  noContentHelpKey: "discourse_assigns.no_assigns",
  model: function() {
    return this.store.findFiltered('topicList', {filter: 'latest', params: {assigned:  this.modelFor('user').get('username_lower') }});
  }
});
