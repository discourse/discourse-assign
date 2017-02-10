import { withPluginApi } from 'discourse/lib/plugin-api';

function initialize(api) {
  api.addPostSmallActionIcon('assigned','user-plus');

  api.decorateWidget('post-contents:after-cooked', dec => {
    if (dec.attrs.post_number === 1) {
      const postModel = dec.getModel();
      if (postModel) {
        const assignedToUser = postModel.get('topic.assigned_to_user');
        if (assignedToUser) {
          const html = I18n.t('discourse_assign.assign_html', assignedToUser);
          //const topic = postModel.get('topic');
          return dec.rawHtml(html);
        }
      }
    }
  });
};

export default {
  name: 'extend-for-assign',
  initialize() {
    withPluginApi('0.8', initialize);
  }
};
