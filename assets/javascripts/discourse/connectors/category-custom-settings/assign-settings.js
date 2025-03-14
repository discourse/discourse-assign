import Component from "@ember/component";
import { action } from "@ember/object";

export default class AssignSettings extends Component {
  @action
  onChangeSetting(value) {
    this.set(
      "outletArgs.category.custom_fields.enable_unassigned_filter",
      value ? "true" : "false"
    );
  }
}
