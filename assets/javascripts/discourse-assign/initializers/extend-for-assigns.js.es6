import { withPluginApi } from 'discourse/lib/plugin-api';
import { observes } from 'ember-addons/ember-computed-decorators';


// should this be in API ?
import Topic from 'discourse/models/topic';
import TopicFooterDropdown from 'discourse/components/topic-footer-mobile-dropdown';
import showModal from 'discourse/lib/show-modal';
import { iconNode } from 'discourse-common/lib/icon-library';
import { h } from 'virtual-dom';

function initialize(api, container) {

  const siteSettings = container.lookup('site-settings:main');
  const currentUser = container.lookup('current-user:main');

  // doing this mess while we come up with a better API
  TopicFooterDropdown.reopen({
    _createContent() {
      this._super();

      if (!this.get('currentUser.staff') || !siteSettings.assign_enabled) {
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
  api.addPostSmallActionIcon('unassigned','user-times');

  api.addPostTransformCallback((transformed) => {
    if (transformed.actionCode === "assigned" || transformed.actionCode === "unassigned") {
      transformed.isSmallAction = true;
      transformed.canEdit = false;
    }
  });

  api.addDiscoveryQueryParam('assigned', {replace: true, refreshModel: true});

  api.addTagsHtmlCallback((topic) => {
    const assignedTo = topic.get('assigned_to_user.username');
    if (assignedTo) {
      const assignedPath = topic.get('assignedToUserPath');
      return `<a class='assigned-to discourse-tag simple' href='${assignedPath}'><i class='fa fa-user-plus'></i>${assignedTo}</a>`;
    }

  });

  if (currentUser && currentUser.get("staff") && siteSettings.assign_enabled) {
    api.addUserMenuGlyph({
      label: 'discourse_assign.assigned',
      className: 'assigned',
      icon: 'user-plus',
      href: `${currentUser.get("path")}/activity/assigned`
    });
  }

  api.createWidget('assigned-to', {
    html(attrs) {
      let { assignedToUser, href } = attrs;

      return h('p.assigned-to', [
        iconNode('user-plus'),
        h('span.assign-text', I18n.t('discourse_assign.assigned_to')),
        h('a', { attributes: { class: 'assigned-to-username', href } }, assignedToUser.username)
      ]);
    }
  });

  api.decorateWidget('post-contents:after-cooked', dec => {
    if (dec.attrs.post_number === 1) {
      const postModel = dec.getModel();
      if (postModel) {
        const assignedToUser = postModel.get('topic.assigned_to_user');
        if (assignedToUser) {
          return dec.widget.attach('assigned-to', {
            assignedToUser,
            href: postModel.get('topic.assignedToUserPath')
          });
        }
      }
    }
  });


};

export default {
  name: 'extend-for-assign',
  initialize(container) {
    withPluginApi('0.8.5', api => {
      initialize(api, container);
    });

    // Fix icons in new versions of discourse
    withPluginApi('0.8.10', api => {
      api.replaceIcon('notification.discourse_assign.assign_notification', 'user-plus');
    });
  }
};
