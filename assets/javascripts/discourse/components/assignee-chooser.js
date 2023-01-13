import EmailGroupUserChooser from "select-kit/components/email-group-user-chooser";

export default EmailGroupUserChooser.extend({
  modifyComponentForRow() {
    return "assignee-chooser-row";
  },
});
