import { withPluginApi } from 'discourse/lib/plugin-api';

// should this be in API ?
import Topic from 'discourse/models/topic';

function initialize(api, container) {

  const siteSettings = container.lookup('site-settings:main');

  Topic.reopen({
    assignedToUserPath: function(){
      return siteSettings.assigns_user_url_path.replace("{username}", this.get("assigned_to_user.username"));
    }.property('owner')
  });

  api.addPostSmallActionIcon('assigned','user-plus');

  api.decorateWidget('post-contents:after-cooked', dec => {
    if (dec.attrs.post_number === 1) {
      const postModel = dec.getModel();
      if (postModel) {
        const assignedToUser = postModel.get('topic.assigned_to_user');
        if (assignedToUser) {
          const path = postModel.get('topic.assignedToUserPath');
          const userLink = `<a href='${path}'>${assignedToUser.username}</a>`;
          const html = I18n.t('discourse_assign.assign_html', {userLink});
          return dec.rawHtml(html);
        }
      }
    }

  });
};

export default {
  name: 'extend-for-assign',
  initialize(container) {
    withPluginApi('0.8', api => {
      initialize(api, container);
    });
  }
};
