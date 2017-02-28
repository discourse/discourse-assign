import { withPluginApi } from 'discourse/lib/plugin-api';
import { observes } from 'ember-addons/ember-computed-decorators';


// should this be in API ?
import Topic from 'discourse/models/topic';
import TopicFooterDropdown from 'discourse/components/topic-footer-mobile-dropdown';
import showModal from 'discourse/lib/show-modal';

function initialize(api, container) {

  const siteSettings = container.lookup('site-settings:main');

  // doing this mess while we come up with a better API
  TopicFooterDropdown.reopen({
    _createContent() {
      this._super();

      if (!this.get('currentUser.staff')) {
        return;
      }
      const content = this.get('content');
      content.push({ id: 'assign', icon: 'user-plus', name: I18n.t('discourse_assign.assign.title') });
    },

    @observes('value')
    _gotAssigned() {

      if (!this.get('currentUser.staff')) {
        return;
      }

      const value = this.get('value');
      const topic = this.get('topic');

      if (value === 'assign') {

        showModal("assign-user", {
          model: {
            topic: topic,
            username: topic.get('assigned_to_user.username')
          }
        });
        this._createContent();
        this.set('value', null);
      }
    }
  });

  Topic.reopen({
    assignedToUserPath: function(){
      return siteSettings.assigns_user_url_path.replace("{username}", this.get("assigned_to_user.username"));
    }.property('assigned_to_user')
  });

  api.addPostSmallActionIcon('assigned','user-plus');

  api.addDiscoveryQueryParam('assigned', {replace: true, refreshModel: true});

  api.addTagsHtmlCallback((topic) => {
    const assignedTo = topic.get('assigned_to_user.username');
    if (assignedTo) {
      const assignedPath = topic.get('assignedToUserPath');
      return `<a class='assigned-to discourse-tag simple' href='${assignedPath}'><i class='fa fa-user-plus'></i>${assignedTo}</a>`;
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
    withPluginApi('0.8.2', api => {
      initialize(api, container);
    });
  }
};
