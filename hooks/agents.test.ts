import { expect, mock, test } from 'claude-code/testing'

const start = { cwd: '/', surface: 'desktop', isInteractive: true } as const
const PANE = {
  plugin: 'mascot',
  component: 'Pane',
  requestId: 'mascot',
  props: {
    title: 'Clawd',
    isFocused: false,
    bodyColumns: 36,
    placement: 'dock',
    scroll: { offset: 0, bodyRows: 20 },
    view: {},
  },
  surface: 'terminal',
} as const

test('Clawd keeps working while a subagent runs, and rests once it is done', async ($, on) => {
  let running = true
  const clock = mock.clock(on)
  mock.store(on, { 'welcomed-4': true })
  mock.session(on)
  on('command.register', () => ({ value: { command: 'mascot' } }))
  on('ui.open', () => ({ value: { isPlaced: true } }))
  on('session.messages', () => ({ value: [] }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))
  on('turn.start', (_, e) => ({ turnId: e.turnId }))
  on('turn.complete', () => ({ text: '' }))
  on('agent.list', () => ({
    value: [{ id: 'a1', description: 'research', type: 'general-purpose', status: running ? 'running' : 'completed', kind: 'local_agent' }],
  }))

  const phase = async () => {
    const ui = await $.ui.mount(PANE)
    const text = (await ui.find({ type: 'Text' }))?.text
    await ui.unmount()

    return text
  }

  await $.session.start(start)
  await $.turn.start({ text: 'go', turnId: 't1' })
  await $.turn.start({ text: 'sub', turnId: 's1', agentId: 'a1' })
  await $.turn.complete({ turnId: 't1', reason: 'answer' } as never)
  await clock.advance(10_000)
  expect(await phase()).toBe('coding…')

  running = false
  await $.turn.complete({ turnId: 's1', reason: 'answer', agentId: 'a1' } as never)
  await clock.advance(10_000)
  expect(await phase()).toBe('putting the laptop away')
})
