import Service from '@ember/service';
import { action } from '@ember/object';

export default class BulkAssignManagerService extends Service {
  registeredAction = null;

  @action
  registerAction(action) {
    this.registeredAction = action;
  }

  @action
  invokeAction(...args) {
    if (typeof this.registeredAction === 'function') {
      this.registeredAction(...args);
    }
  }
}