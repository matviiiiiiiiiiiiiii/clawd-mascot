import { expect, mock, test } from 'claude-code/testing'

const start = { cwd: '/', surface: 'desktop', isInteractive: true } as const

test('the first session puts the instructions in the chat, once, and opens a narrow pane', async ($, on) => {
  const store = new Map<string, unknown>()
  const opened: Array<number | undefined> = []
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'mascot' } }))
  on('ui.open', (_, e) => {
    opened.push(e.columns)

    return { value: { isPlaced: true } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  const session = mock.session(on)

  await $.session.start(start)
  const notes = () => JSON.stringify(session.appended())
  expect(notes()).toContain('/mascot off')
  expect(notes()).toContain('claude plugin uninstall mascot@clawd-mascot')
  expect(opened[0]).toBe(36)

  const before = notes().split('Clawd mascot is installed').length
  await $.session.start(start)
  expect(notes().split('Clawd mascot is installed').length).toBe(before)
})
