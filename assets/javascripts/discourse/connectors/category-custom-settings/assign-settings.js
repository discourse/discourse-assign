import Component from "@ember/component";
import { action } from "@ember/object";

export default class AssignSettings extends Component {
  @action
  onChangeSetting(event) {
    this.set(
      "outletArgs.category.custom_fields.enable_unassigned_filter",
      event.target.checked ? "true" : "false"
    );
  }
}
