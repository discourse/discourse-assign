import topicFixtures from "discourse/tests/fixtures/topic";
import { cloneJSON } from "discourse-common/lib/object";

export default function topicWithAssignedPost() {
  const username = "eviltrout";
  const topic = cloneJSON(topicFixtures["/t/28830/1.json"]);
  const secondPost = topic.post_stream.posts[1];

  topic["indirectly_assigned_to"] = {
    [secondPost.id]: {
      assigned_to: {
        username,
      },
      post_number: 1,
    },
  };
  secondPost["assigned_to_user"] = { username };

  return topic;
}
