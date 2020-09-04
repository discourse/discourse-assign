export function shouldShowAssigned(args, component) {
  const needsButton =
    component.currentUser && component.currentUser.get("can_assign");
  return (
    needsButton &&
    (!component.get("site.mobileView") || args.model.get("isPrivateMessage"))
  );
}

export default {
  shouldRender(args, component) {
    return shouldShowAssigned(args, component);
  },
};
