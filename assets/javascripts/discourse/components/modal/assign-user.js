// TODO
import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import { isEmpty } from "@ember/utils";
import { ajax } from "discourse/lib/ajax";
import { popupAjaxError } from "discourse/lib/ajax-error";
import I18n from "I18n";

export default class AssignUser extends Component {
  @service taskActions;
  @service siteSettings;
  @service capabilities;

  @tracked assignSuggestions = null;
  @tracked allowedGroups = [];
  @tracked allowedGroupsForAssignment = [];
  @tracked assigneeError = false;
  @tracked assigneeName =
    this.args.model.username || this.args.model.group_name;

  constructor() {
    super(...arguments);

    // TODO: move to a dedicated service
    ajax("/assign/suggestions").then((data) => {
      if (this.isDestroying || this.isDestroyed) {
        return;
      }
      this.assignSuggestions = data.suggestions;
      this.allowedGroups = data.assign_allowed_on_groups;
      this.allowedGroupsForAssignment = data.assign_allowed_for_groups;
    });
  }

  // TODO
  bulkAction(username, note) {
    return this.topicBulkActions.performAndRefresh({
      type: "assign",
      username,
      note,
    });
  }

  get title() {
    let i18nSuffix;

    switch (this.args.model.targetType) {
      case "Post":
        i18nSuffix = "_post_modal";
        break;
      case "Topic":
        i18nSuffix = "_modal";
        break;
    }

    return I18n.t(
      "discourse_assign.assign" +
        i18nSuffix +
        `.${this.args.model.reassign ? "reassign_title" : "title"}`
    );
  }

  get availableStatuses() {
    return this.siteSettings.assign_statuses
      .split("|")
      .map((status) => ({ id: status, name: status }));
  }

  get status() {
    return (
      this.args.model.status ||
      this.args.model.target.assignment_status ||
      this.siteSettings.assign_statuses.split("|")[0]
    );
  }

  @action
  handleTextAreaKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      this.assign();
    }
  }

  @action
  async assign() {
    const { model } = this.args;

    if (this.isBulkAction) {
      return this.bulkAction(model.username, model.note);
    }

    if (!this.assigneeName) {
      this.assigneeError = true;
      return;
    }

    if (isEmpty(model.username)) {
      model.target.set("assigned_to_user", null);
    }

    if (isEmpty(model.group_name)) {
      model.target.set("assigned_to_group", null);
    }

    let path = "/assign/assign";
    if (isEmpty(model.username) && isEmpty(model.group_name)) {
      path = "/assign/unassign";
    }

    this.args.closeModal();

    try {
      await ajax(path, {
        type: "PUT",
        data: {
          username: model.username,
          group_name: model.group_name,
          target_id: model.target.id,
          target_type: model.targetType,
          note: model.note,
          status: model.status,
        },
      });

      model.onSuccess?.();
    } catch (error) {
      popupAjaxError(error);
    }
  }

  @action
  assignUsername([name]) {
    this.assigneeName = name;
    this.assigneeError = false;
    this.args.model.allowedGroups = this.taskActions.allowedGroups;

    if (this.allowedGroupsForAssignment.includes(name)) {
      this.args.model.username = null;
      this.args.model.group_name = name;
    } else {
      this.args.model.username = name;
      this.args.model.group_name = null;
    }
  }
}
