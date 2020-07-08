import Controller, { inject as controller } from '@ember/controller'

export default Controller.extend({
  application: controller(),
  loading: false,

  findMembers(refresh) {
    if (this.loading || !this.model) {
      return
    }

    if (!refresh && this.model.members.length >= this.model.user_count) {
      this.set('application.showFooter', true)
      return
    }

    this.set('loading', true)
    this.model
      .findMembers({ order: '', asc: true, filter: null }, refresh)
      .finally(() => {
        this.setProperties({
          'application.showFooter':
            this.model.members.length >= this.model.user_count,
          loading: false,
        })
      })
  },

  actions: {
    loadMore: function() {
      this.findMembers()
    },
  },
})
