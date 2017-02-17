import { withPluginApi } from 'discourse/lib/plugin-api';
import { h } from 'virtual-dom';

// should this be in API ?
import Topic from 'discourse/models/topic';

function initialize(api, container) {

  const siteSettings = container.lookup('site-settings:main');

  Topic.reopen({
    assignedToUserPath: function(){
      return siteSettings.assigns_user_url_path.replace("{username}", this.get("assigned_to_user.username"));
    }.property('assigned_to_user')
  });

  api.addPostSmallActionIcon('assigned','user-plus');

  api.addDiscoveryQueryParam('assigned', {replace: true, refreshModel: true});

  api.decorateWidget('header-topic-info:after-tags', dec => {

    const topic = dec.attrs.topic;
    const assignedTo = topic.get('assigned_to_user.username');
    if (assignedTo) {
      const assignedPath = topic.get('assignedToUserPath');
      return h('div.list-tags.assigned',
          h('a.assigned-to.discourse-tag.simple', {href: assignedPath}, [
            h('i.fa.fa-user-plus'),
            assignedTo
          ])
      );
    }
  });

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
    withPluginApi('0.8.1', api => {
      initialize(api, container);
    });
  }
};
