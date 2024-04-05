import Component from "@glimmer/component";
import { action } from "@ember/object";
import I18n from "I18n";

export default class AssignableInteractionFields extends Component {
  assignableLevelOptions = [
    { name: I18n.t("groups.alias_levels.nobody"), value: 0 },
    { name: I18n.t("groups.alias_levels.only_admins"), value: 1 },
    { name: I18n.t("groups.alias_levels.mods_and_admins"), value: 2 },
    { name: I18n.t("groups.alias_levels.members_mods_and_admins"), value: 3 },
    { name: I18n.t("groups.alias_levels.owners_mods_and_admins"), value: 4 },
    { name: I18n.t("groups.alias_levels.everyone"), value: 99 },
  ];

  get assignableLevel() {
    return this.args.outletArgs.model.get("assignable_level") || 0;
  }

  @action
  onChangeAssignableLevel(level) {
    this.args.outletArgs.model.set("assignable_level", level);
  }
}
