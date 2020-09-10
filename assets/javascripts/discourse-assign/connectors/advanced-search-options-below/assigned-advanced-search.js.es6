export default {
  shouldRender(args, component) {
    return (
      component.currentUser &&
      component.currentUser.can_assign &&
    );
  },
};