import { withPluginApi } from 'discourse/lib/plugin-api';
import { default as computed, observes } from 'ember-addons/ember-computed-decorators';

// should this be in API ?
import showModal from 'discourse/lib/show-modal';
import { iconNode } from 'discourse-common/lib/icon-library';
import { h } from 'virtual-dom';

function initialize(api) {

  // You can't act on flags claimed by another user
  api.modifyClass('component:flagged-post', {
    @computed('flaggedPost.topic.assigned_to_user_id', 'filter')
    canAct(assignedToUserId, filter) {
      if (assignedToUserId && this.currentUser.id !== assignedToUserId) {
        return false;
      }

      return this._super(filter);
    },

    didInsertElement() {
      this._super();
      this.messageBus.subscribe("/staff/topic-assignment", data => {

        let flaggedPost = this.get('flaggedPost');
        if (data.topic_id === flaggedPost.get('topic.id')) {
          flaggedPost.set('topic.assigned_to_user_id',
            data.type === 'assigned' ? data.assigned_to.id : null
          );
          flaggedPost.set('topic.assigned_to_user', data.assigned_to);
        }
      });
    },

    willDestroyElement() {
      this._super();
      this.messageBus.unsubscribe("/staff/topic-assignment");
    }
  }, { ignoreMissing: true });

  // doing this mess while we come up with a better API
  api.modifyClass('component:topic-footer-mobile-dropdown', {
    _createContent() {
      this._super();

      if (!this.get('currentUser.staff') || !this.siteSettings.assign_enabled) {
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

  api.modifyClass('model:topic', {
    @computed('assigned_to_user')
    assignedToUserPath(assignedToUser) {
      return this.siteSettings.assigns_user_url_path.replace(
        "{username}",
        Ember.get(assignedToUser, 'username')
      );
    }
  });

  api.addPostSmallActionIcon('assigned','user-plus');
  api.addPostSmallActionIcon('unassigned','user-times');

  api.addPostTransformCallback(transformed => {
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

  api.addUserMenuGlyph(widget => {
    return undefined;

    if (widget.currentUser &&
        widget.currentUser.get('staff') &&
        widget.siteSettings.assign_enabled) {

      return {
        label: 'discourse_assign.assigned',
        className: 'assigned',
        icon: 'user-plus',
        href: `${widget.currentUser.get("path")}/activity/assigned`,
      };
    }
  });

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

  api.replaceIcon('notification.discourse_assign.assign_notification', 'user-plus');
};

export default {
  name: 'extend-for-assign',
  initialize(container) {
    withPluginApi('0.8.11', api => initialize(api, container));
  }
};
