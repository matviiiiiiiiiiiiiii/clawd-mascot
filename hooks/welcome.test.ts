import { expect, mock, test } from 'claude-code/testing'
type On = Parameters<typeof mock.session>[0]

const start = { cwd: '/', surface: 'desktop', isInteractive: true } as const

const setup = (on: On, placed: boolean) => {
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

    return { value: placed ? { isPlaced: true } : { isPlaced: false, reason: 'no surface' } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  const session = mock.session(on)

  return { store, opened, notes: () => JSON.stringify(session.appended()) }
}

test('where Clawd is on screen, the chat gets the instructions once, and the pane opens narrow', async ($, on) => {
  const { opened, notes } = setup(on, true)

  await $.session.start(start)
  expect(notes()).toContain('/mascot off')
  expect(notes()).toContain('claude plugin uninstall mascot@clawd-mascot')
  expect(opened[0]).toBe(36)

  const before = notes().split('Clawd mascot is installed').length
  await $.session.start(start)
  expect(notes().split('Clawd mascot is installed').length).toBe(before)
})

test('a session with no screen gets no note and does not use it up', async ($, on) => {
  const { store, notes } = setup(on, false)

  await $.session.start(start)
  expect(notes()).not.toContain('Clawd mascot is installed')
  expect(store.size === 0 || ![...store.values()].includes(true)).toBe(true)
})
