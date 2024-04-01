import Component from "@glimmer/component";
import { tracked } from "@glimmer/tracking";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";

export default class Assignment extends Component {
  @service siteSettings;
  @service taskActions;

  @tracked assignee = this.args.model.username || this.args.model.group_name;

  constructor() {
    super(...arguments);
  }

  get status() {
    return this.args.status || this.#assignStatuses[0];
  }

  get assignStatusOptions() {
    return this.#assignStatuses.map((status) => ({ id: status, name: status }));
  }

  @action
  handleTextAreaKeydown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      this.args.onSubmit();
    }
  }

  get #assignStatuses() {
    return this.siteSettings.assign_statuses.split("|");
  }
}
