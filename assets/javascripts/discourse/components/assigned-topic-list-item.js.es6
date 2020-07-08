import {
  ListItemDefaults,
  default as TopicListItem,
} from 'discourse/components/topic-list-item'

// This is a backward compatible fix so that this change:
// https://github.com/discourse/discourse/pull/8589
// in discourse core doesn't break this plugin.
let assignedTopicListItem = null

if (ListItemDefaults) {
  assignedTopicListItem = Ember.Component.extend(ListItemDefaults, {
    isPrivateMessage: Ember.computed.equal(
      'topic.archetype',
      'private_message'
    ),
  })
} else {
  assignedTopicListItem = TopicListItem.extend({
    isPrivateMessage: Ember.computed.equal(
      'topic.archetype',
      'private_message'
    ),
  })
}

export default assignedTopicListItem
