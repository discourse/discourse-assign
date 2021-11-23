import TopicListItem from "discourse/components/topic-list-item";
import { equal } from "@ember/object/computed";

export default TopicListItem.extend({
  classNames: ["assigned-topic-list-item"],
  isPrivateMessage: equal("topic.archetype", "private_message"),
});
