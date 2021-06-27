import TopicListItem from "discourse/components/topic-list-item";
import { equal } from "@ember/object/computed";

export default TopicListItem.extend({
  isPrivateMessage: equal("topic.archetype", "private_message"),
});
