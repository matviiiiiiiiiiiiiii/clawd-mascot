import { expect, mock, test } from 'claude-code/testing'

type On = Parameters<typeof mock.session>[0]

const start = { cwd: '/', surface: 'desktop', isInteractive: true } as const
const NOTE = 'Clawd mascot is installed'

const setup = (on: On, { placed, begun }: { placed: boolean; begun: boolean }) => {
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
  on('session.messages', () => ({
    value: begun ? [{ role: 'user', text: 'install the mod', toolUses: [] }] : [],
  }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('clock.now', () => ({ value: 0 }))
  const session = mock.session(on)
  const notes = () => JSON.stringify(session.appended())
  const count = () => notes().split(NOTE).length - 1

  return { store, opened, notes, count }
}

test('installed from a chat: the note is in that chat at once, once, and the pane opens narrow', async ($, on) => {
  const { opened, count, notes } = setup(on, { placed: true, begun: true })

  await $.session.start(start)
  expect(count()).toBe(1)
  expect(notes()).toContain('/mascot off')
  expect(notes()).toContain('claude plugin uninstall mascot@clawd-mascot')
  expect(opened[0]).toBe(36)

  await $.session.start(start)
  expect(count()).toBe(1)
})

test('a fresh session waits for its first message, then shows the note', async ($, on) => {
  const { count } = setup(on, { placed: true, begun: false })

  await $.session.start(start)
  expect(count()).toBe(0)

  await $.turn.start({ text: 'hi', turnId: 't1' })
  expect(count()).toBe(1)

  await $.turn.start({ text: 'again', turnId: 't2' })
  expect(count()).toBe(1)
})

test('a session with no screen gets no note and does not use it up', async ($, on) => {
  const { store, count } = setup(on, { placed: false, begun: true })

  await $.session.start(start)
  await $.turn.start({ text: 'hi', turnId: 't1' })
  expect(count()).toBe(0)
  expect([...store.values()].includes(true)).toBe(false)
})
