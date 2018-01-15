export default {
  shouldRender(args) {
    return args.actableFilter && !args.topic;
  }
};
