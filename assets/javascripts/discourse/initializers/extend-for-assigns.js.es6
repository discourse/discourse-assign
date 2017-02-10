import { withPluginApi } from 'discourse/lib/plugin-api';

function initialize(api) {
  api.addPostSmallActionIcon('assigned','user-plus');
};

export default {
  name: 'extend-for-assign',
  initialize() {
    withPluginApi('0.8', initialize);
  }
};
