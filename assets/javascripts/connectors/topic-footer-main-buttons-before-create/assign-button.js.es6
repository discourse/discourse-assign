import showModal from 'discourse/lib/show-modal';

export default {
  shouldRender(args, component) {
    return component.currentUser && component.currentUser.get('staff');
  },

  actions: {
    assign(){
      showModal("assign-user", { model: this.topic });
    }
  }
};
