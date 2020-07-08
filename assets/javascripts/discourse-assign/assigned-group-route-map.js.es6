export default {
  resource: 'group',
  map() {
    this.route('assignments', function() {
      this.route('show', { path: '/:filter' })
    })
  },
}
