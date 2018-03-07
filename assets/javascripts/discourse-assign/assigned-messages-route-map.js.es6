export default {
  resource: 'user.userPrivateMessages',
  map() {
    this.route('assigned');
    this.route('assigned_archived');
  }
};
