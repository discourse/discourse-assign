import Category from 'discourse/models/category'

export default {
  name: 'extend-category-for-assign',

  before: 'inject-discourse-objects',

  initialize() {
    Category.reopen({
      enable_unassigned_filter: Ember.computed(
        'custom_fields.enable_unassigned_filter',
        {
          get() {
            if (this && this.custom_fields) {
              return this.custom_fields.enable_unassigned_filter === 'true'
            }
            return false
          },
        }
      ),
    })
  },
}
