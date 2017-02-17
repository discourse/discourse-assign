//import { default as computed } from 'ember-addons/ember-computed-decorators';
import { ajax } from 'discourse/lib/ajax';
import { popupAjaxError } from 'discourse/lib/ajax-error';

export default Ember.Controller.extend({

  // @computed("username")
  // disabled(username) {
  //   return Ember.isEmpty(username);
  // },

  actions: {
    assign(){

      let path = '/assign/assign';

      if (Ember.isEmpty(this.get('model.username'))) {
        path = '/assign/unassign';
        this.set('model.assigned_to_user', null);
      }

      return ajax(path,{
        type: 'PUT',
        data: { username: this.get('model.username'), topic_id: this.get('model.topic.id') }
      }).then(()=>{
        //console.log(user);
        this.send('closeModal');
      }).catch(popupAjaxError);
    }
  }
});
