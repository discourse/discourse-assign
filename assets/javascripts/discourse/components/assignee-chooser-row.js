import EmailGroupUserChooserRow from "select-kit/components/email-group-user-chooser-row";

export default EmailGroupUserChooserRow.extend({
  stopPropagation(instance, event) {
    event.stopPropagation();
  },
});
