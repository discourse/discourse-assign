import { ajax } from 'discourse/lib/ajax';
import { popupAjaxError } from 'discourse/lib/ajax-error';

export default Ember.Component.extend({
  tagName: '',
  claiming: false,
  unassigning: false,

  actions: {
    unassign() {
      this.set('unassigning', true);
      return ajax("/assign/unassign", {
        type: 'PUT',
        data: { topic_id: this.get('topic.id') }
      }).then(() => {
        this.set('topic.assigned_to_user', null);
      }).catch(popupAjaxError).finally(() => {
        this.set('unassigning', false);
      });
    },

    claim() {
      this.set('claiming', true);

      let topic = this.get('topic');
      ajax(`/assign/claim/${topic.id}`, {
        method: 'PUT'
      }).then(() => {
        this.set('topic.assigned_to_user', this.currentUser);
      }).catch(e => {
        if (e.jqXHR && e.jqXHR.responseJSON) {
          let json = e.jqXHR.responseJSON;
          if (json && json.extras) {
            this.set('topic.assigned_to_user', json.extras.assigned_to);
          }
        }
        return popupAjaxError(e);
      }).finally(() => {
        if (this.isDestroying || this.isDestroyed) { return; }
        this.set('claiming', false);
      });
    }
  }
});
