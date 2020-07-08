import { acceptance } from 'helpers/qunit-helpers'
import { default as AssignedTopics } from '../fixtures/assigned-group-assignments-fixtures'

acceptance('GroupAssignments', {
  loggedIn: true,
  settings: { assign_enabled: true, assigns_user_url_path: '/' },
  pretend(server, helper) {
    const messagesPath = '/assign/assigned/discourse.json'
    const assigns = AssignedTopics[messagesPath]
    server.get(messagesPath, () => helper.response(assigns))
    server.get('/assign/assigned/awesomerobot.json', () =>
      helper.response(AssignedTopics['/assign/assigned/awesomerobot.json'])
    )
  },
})
QUnit.test('Group Assignments Everyone', async assert => {
  await visit('/g/discourse/assignments')
  assert.equal(currentPath(), 'group.assignments.show')
  assert.ok(find('.topic-list-item').length === 1)
})

QUnit.test('Group Assignments Awesomerobot', async assert => {
  await visit('/g/discourse/assignments/awesomerobot')
  assert.equal(currentPath(), 'group.assignments.show')
  assert.ok(find('.topic-list-item').length === 1)
})
