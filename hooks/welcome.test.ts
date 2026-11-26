import { expect, test } from 'claude-code/testing'

const start = { cwd: '/', surface: 'desktop', isInteractive: true } as const

test('the first session shows the instructions in the chat, once', async ($, on) => {
  const lines: string[] = []
  const store = new Map<string, unknown>()
  on('ui.log', (_, e) => {
    lines.push(e.text)

    return { value: undefined }
  })
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })
  on('command.register', () => ({ value: { command: 'mascot' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  await $.session.start(start)
  expect(lines.some(l => l.includes('/mascot off'))).toBe(true)
  expect(lines.some(l => l.includes('claude plugin uninstall mascot@clawd-mascot'))).toBe(true)

  const shown = lines.length
  await $.session.start(start)
  expect(lines.length).toBe(shown)
})
