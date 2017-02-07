import { default as computed } from 'ember-addons/ember-computed-decorators';
import { ajax } from 'discourse/lib/ajax';
import { popupAjaxError } from 'discourse/lib/ajax-error';

export default Ember.Controller.extend({

  @computed("username")
  disabled(username) {
    return Ember.isEmpty(username);
  },

  actions: {
    assign(){
      return ajax('/assign/assign',{
        type: 'PUT',
        data: { username: this.get('username'), topic_id: 1 }
      }).catch(popupAjaxError);
    }
  }
});
