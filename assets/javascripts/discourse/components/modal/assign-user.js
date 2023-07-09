import Component from "@glimmer/component";
import { action } from "@ember/object";
import { inject as service } from "@ember/service";
import I18n from "I18n";

export default class AssignUser extends Component {
  @service taskActions;

  formApi = {
    sumbit() {},
  };

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

  @action
  async onSubmit() {
    this.args.closeModal();
    await this.taskActions.assign(this.args.model);
  }
}
