import I18n from "I18n";
import DropdownSelectBoxComponent from "select-kit/components/dropdown-select-box";
import { action } from "@ember/object";

export default DropdownSelectBoxComponent.extend({
  classNames: ["assign-actions-dropdown"],
  headerIcon: null,
  title: "...",
  allowInitialValueMutation: false,
  showFullTitle: true,

  computeContent() {
    let options = [];
    if (this.assignee) {
      options = options.concat([
        {
          id: "unassign",
          icon: this.group ? "group-times" : "user-times",
          name: I18n.t("discourse_assign.unassign.title"),
          description: I18n.t("discourse_assign.unassign.help", {
            username: this.assignee,
          }),
        },
        {
          id: "reassign",
          icon: "users",
          name: I18n.t("discourse_assign.reassign.title"),
          description: I18n.t("discourse_assign.reassign.help"),
        },
      ]);
    }

    if (this.topic.indirectly_assigned_to) {
      Object.entries(this.topic.indirectly_assigned_to).forEach((entry) => {
        const [postId, assignee] = entry;
        options = options.concat({
          id: `unassign_post_${postId}`,
          icon: assignee.username ? "user-times" : "group-times",
          name: I18n.t("discourse_assign.unassign_post.title"),
          description: I18n.t("discourse_assign.unassign_post.help", {
            username: assignee.username || assignee.name,
          }),
        });
      });
    }
    return options;
  },

  @action
  onSelect(id) {
    switch (id) {
      case "unassign":
        this.unassign(this.topic.id);
        break;
      case "reassign":
        this.reassign(this.topic, this.assignee);
        break;
    }
    const postId = id.match(/unassign_post_(\d+)/)?.[1];
    if (postId) {
      this.unassign(postId, "Post");
    }
  },
});
