import UserActivityStreamRoute from "discourse/routes/user-activity-stream";

export default UserActivityStreamRoute.extend({
  userActionType: 16,
  noContentHelpKey: "discourse_assigns.no_assigns"
});
