import { ListItemDefaults } from "discourse/components/topic-list-item";

export default Ember.Component.extend(ListItemDefaults, {
  isPrivateMessage: Ember.computed.equal("topic.archetype", "private_message")
});
