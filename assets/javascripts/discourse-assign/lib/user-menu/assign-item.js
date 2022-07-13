import UserMenuBaseItem from "discourse/lib/user-menu/base-item";
import { postUrl } from "discourse/lib/utilities";
import { htmlSafe } from "@ember/template";
import { emojiUnescape } from "discourse/lib/text";
import I18n from "I18n";

const ICON = "user-plus";
const GROUP_ICON = "group-plus";

export default class UserMenuAssignItem extends UserMenuBaseItem {
  constructor({ assign }) {
    super(...arguments);
    this.assign = assign;
  }

  get className() {
    return "assign";
  }

  get linkHref() {
    return postUrl(
      this.assign.slug,
      this.assign.id,
      (this.assign.last_read_post_number || 0) + 1
    );
  }

  get linkTitle() {
    if (this.assign.assigned_to_group) {
      return I18n.t("user.assigned_to_group", {
        group_name:
          this.assign.assigned_to_group.full_name ||
          this.assign.assigned_to_group.name,
      });
    } else {
      return I18n.t("user.assigned_to_you");
    }
  }

  get icon() {
    if (this.assign.assigned_to_group) {
      return GROUP_ICON;
    } else {
      return ICON;
    }
  }

  get label() {
    return null;
  }

  get description() {
    return htmlSafe(emojiUnescape(this.assign.fancy_title));
  }

  get topicId() {
    return this.assign.id;
  }
}
