export default {
  shouldRender(args, component) {
    return component.currentUser && component.currentUser.get("staff");
  }
};
