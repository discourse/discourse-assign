export default {
  shouldRender(args, component) {
    let render = component.currentUser.admin;
    component.currentUser.groups.forEach(element => {
      if (element.name === component.attrs.args.group.name) {
        render = true;
        return false;
      }
    });
    return render;
  }
};
