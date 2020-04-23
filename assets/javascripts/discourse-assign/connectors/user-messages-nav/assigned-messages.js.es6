export function shouldShowAssigned(args, component) {
  const needsButton = component.currentUser && component.currentUser.can_assign;
  return (
    needsButton &&
    (!component.get("site.mobileView") || args.model.isPrivateMessage)
  );
}

export default {
  shouldRender(args, component) {
    return shouldShowAssigned(args, component);
  }
};
