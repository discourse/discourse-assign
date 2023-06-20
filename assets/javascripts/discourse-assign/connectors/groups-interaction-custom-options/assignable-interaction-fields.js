import I18n from "I18n";
import { or } from "@ember/object/computed";
import { defineProperty } from "@ember/object";

export default {
  name: "assignable-interaction-fields",

  setupComponent(args, component) {
    this.assignableLevelOptions = [
      { name: I18n.t("groups.alias_levels.nobody"), value: 0 },
      { name: I18n.t("groups.alias_levels.only_admins"), value: 1 },
      { name: I18n.t("groups.alias_levels.mods_and_admins"), value: 2 },
      { name: I18n.t("groups.alias_levels.members_mods_and_admins"), value: 3 },
      { name: I18n.t("groups.alias_levels.owners_mods_and_admins"), value: 4 },
      { name: I18n.t("groups.alias_levels.everyone"), value: 99 },
    ];

    // TODO
    defineProperty(
      component,
      "assignableLevel",
      or("model.assignable_level", "assignableLevelOptions.firstObject.value")
    );
  },
};
