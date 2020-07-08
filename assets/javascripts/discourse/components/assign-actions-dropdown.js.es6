import DropdownSelectBoxComponent from "select-kit/components/dropdown-select-box";

export default DropdownSelectBoxComponent.extend({
  classNames: ["assign-actions-dropdown"],
  headerIcon: null,
  title: "...",
  allowInitialValueMutation: false,
  showFullTitle: true,

  computeContent() {
    return [
      {
        id: "unassign",
        icon: "user-times",
        name: I18n.t("discourse_assign.unassign.title"),
        description: I18n.t("discourse_assign.unassign.help")
      },
      {
        id: "reassign",
        icon: "users",
        name: I18n.t("discourse_assign.reassign.title"),
        description: I18n.t("discourse_assign.reassign.help")
      }
    ];
  },

  actions: {
    onSelect(id) {
      switch (id) {
        case "unassign":
          this.unassign(this.topic, this.user);
          break;
        case "reassign":
          this.reassign(this.topic, this.user);
          break;
      }
    }
  }
});
