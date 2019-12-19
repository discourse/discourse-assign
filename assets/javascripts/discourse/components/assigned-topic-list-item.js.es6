import TopicListItem from "discourse/components/topic-list-item";

export default TopicListItem.extend({
  isPrivateMessage: Ember.computed.equal("topic.archetype", "private_message")
});
