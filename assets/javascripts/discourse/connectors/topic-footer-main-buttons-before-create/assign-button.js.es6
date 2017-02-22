import showModal from 'discourse/lib/show-modal';

export default {
  shouldRender(args, component) {
    const needsButton = component.currentUser && component.currentUser.get('staff');
    return needsButton && (!component.get('site.mobileView') || args.topic.get('isPrivateMessage'));
  },

  actions: {
    assign(){
      showModal("assign-user", {
        model: {
          topic: this.topic,
          username: this.topic.get('assigned_to_user.username')
        }
      });
    }
  }
};
