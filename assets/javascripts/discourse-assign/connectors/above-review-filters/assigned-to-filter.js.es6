import { action } from "@ember/object";

export default {
  @action
  updateAssignedTo(selected) {
    this.set("additionalFilters.assigned_to", selected.firstObject);
  },

  shouldRender(args) {
    return args.additionalFilters;
  },

  setupComponent(args, component) {
    const groupIDs = (component.siteSettings.assign_allowed_on_groups || "")
      .split("|")
      .filter(Boolean);
    const groupNames = this.site.groups
      .filter((group) => groupIDs.includes(group.id.toString()))
      .mapBy("name");
    component.set("allowedGroups", groupNames);
  },
};
