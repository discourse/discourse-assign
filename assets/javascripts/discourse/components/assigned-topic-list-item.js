import TopicListItem from "discourse/components/topic-list-item";
import { equal } from "@ember/object/computed";

export default class AssignedTopicListItem extends TopicListItem {
  classNames = ["assigned-topic-list-item"];

  @equal("topic.archetype", "private_message") isPrivateMessage;
}
