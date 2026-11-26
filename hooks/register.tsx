import { atom, read, update } from 'claude-code'
import type { CoreEngineInterface, Register, Timer } from 'claude-code'

import type { MascotState, Phase, Shown } from '../types'
import { H, REST, SLEEP, W, WORK } from './art'

const PANE = 'mascot'
const TITLE = 'Clawd'
// Pixel art at a whole-number scale so the pixels stay sharp.
const SCALE = 2
// A turn that ends and another that starts this soon after (a queued
// message) keeps him typing instead of putting the laptop away and back.
const SETTLE_MS = 2500
// Rows the pane's header takes.
const CHROME_ROWS = 6

const state = atom(
  { plugin: 'mascot', key: 'state' } as const,
  { phase: 'sleep', since: 0, prev: null } as MascotState,
  { shape: 'mascot-5' },
)

// Pending "put the laptop away"; a new turn cancels it.
let settle: Timer | undefined

const clip = (shown: Shown): string => {
  if (shown.phase === 'work') return WORK
  // At session start there is no laptop to put away.
  if (shown.phase === 'rest' && shown.since > 0) return REST

  return SLEEP
}

const label: Record<Phase, string> = {
  sleep: 'sleeping',
  work: 'coding…',
  rest: 'putting the laptop away',
}

// Switch phase. One clip at a time: both are transparent, so keeping the
// old one under the new one showed two of him at once.
const go = async ($: Pick<CoreEngineInterface, 'state'>, phase: Phase, at: number) => {
  await update($, state, now => (now.phase === phase ? now : { ...now, phase, since: at, prev: null }))
}

const OFF_KEY = 'off'
const isOff = async ($: Pick<CoreEngineInterface, 'store'>) => (await $.store.get(OFF_KEY)) === true

// Shown in the chat once, the first session after install, and again on
// `/mascot help`: everything a new user needs, with nothing to look up.
// (1.1.0 marked 'welcomed' without the note reaching the chat: a new key
// shows it once more to those who installed that version.)
const WELCOMED_KEY = 'welcomed-2'
const HELP = [
  'Clawd mascot is installed: he codes in the side pane while Claude works, and sleeps when Claude is done.',
  'Hide him: /mascot off, or close the pane with its ×. Bring him back: /mascot on. Just /mascot switches.',
  'Remove the mod: claude plugin uninstall mascot@clawd-mascot in a shell, or remove mascot under Plugins in the desktop app.',
  'See this again any time: /mascot help',
].join('\n')

// A notice row in the conversation itself: stored at once, so it is there
// whenever the chat is drawn, and never read by the model.
const welcome = async ($: Pick<CoreEngineInterface, 'session' | 'store'>) => {
  if ((await $.store.get(WELCOMED_KEY)) === true) return
  const res = await $.session
    .append({ message: { type: 'system', content: [{ type: 'text', text: HELP }] } })
    .catch(() => undefined)
  if (res === undefined || (typeof res === 'object' && res !== null && 'deny' in res)) return
  await $.store.set(WELCOMED_KEY, true).catch(() => undefined)
}

// As narrow as the pane gets while Clawd still fits: the drawing is 270 px.
const COLUMNS = 36
const open = ($: Pick<CoreEngineInterface, 'ui'>) => $.ui.open({ id: PANE, title: TITLE, columns: COLUMNS })

export const register: Register = on => {
  // On or off is remembered across sessions: `/mascot` flips it, `/mascot on`
  // and `/mascot off` set it, and closing the pane with its X turns it off.
  on('session.start', async ($, e, next) => {
    await update($, state, now => ({ ...now, phase: 'sleep' as Phase, since: 0, prev: null }))
    await $.command.register({
      name: 'mascot',
      description: 'Show or hide the Clawd pane (/mascot on, /mascot off, /mascot help)',
    })
    if (!(await isOff($))) void open($)
    const ran = await next(e)
    await welcome($)

    return ran
  })

  on('session.attach', async ($, e, next) => {
    const ran = await next(e)
    if (!(await isOff($))) void open($)
    await welcome($)

    return ran
  })

  on('command.run', { command: 'mascot' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'help') {
      return { text: HELP }
    }
    const turnOn = arg === 'on' ? true : arg === 'off' ? false : await isOff($)
    await $.store.set(OFF_KEY, !turnOn)
    if (turnOn) {
      await open($)

      return { text: 'Clawd is on. /mascot off hides him.' }
    }
    await $.ui.close({ id: PANE })

    return { text: 'Clawd is off. /mascot on brings him back.' }
  })

  on('ui.close', async ($, e, next) => {
    // Never let remembering the choice get in the way of the close itself.
    if (e.id === PANE && e.origin.kind === 'person') {
      await $.store.set(OFF_KEY, true).catch(() => undefined)
    }

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined) {
      settle?.cancel()
      settle = undefined
      const now = await read($, state)
      if (now.phase !== 'work') await go($, 'work', await $.clock.now())
    }

    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    if (e.agentId === undefined) {
      settle?.cancel()
      settle = $.clock.after(SETTLE_MS, () => {
        settle = undefined
        void (async () => {
          const now = await read($, state)
          if (now.phase === 'work') await go($, 'rest', await $.clock.now())
        })()
      })
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    const now = await read($, state)

    if (e.surface === 'terminal') {
      return (
        <Box flexDirection="column">
          <Text dimColor={now.phase !== 'work'}>{label[now.phase]}</Text>
        </Box>
      )
    }
    const { Svg } = $.ui.resolve(e)
    const width = W * SCALE
    const height = H * SCALE
    // One element for all phases: a new phase swaps its source in place, so
    // the old picture stays until the new one is ready. A redraw within a
    // phase keeps the same source and never restarts it.
    const layer = (shown: Shown) => (
      <Box key="clip">
        <Svg
          source={clip(shown)}
          alt={`Clawd ${label[shown.phase]}`}
          width={width}
          height={height}
          // Drawn as an image, not a sandboxed frame: a frame reloads blank
          // on every swap (he blinked out), an image swaps in place.
        />
      </Box>
    )

    // The whole pane less its header, with him standing on its bottom edge,
    // short enough that the pane never scrolls.
    return (
      <Box
        flexDirection="column"
        justifyContent="flex-end"
        // The canvas is centred on his body, so centring it centres him.
        alignItems="center"
        height={Math.max(8, (e.viewport?.rows ?? 24) - CHROME_ROWS)}
        gap={0}
      >
        {/* Box sizes count text cells, not pixels: leave them off and let
            the drawing's own pixel size set the stage. */}
        <Box key="stage">{layer(now)}</Box>
      </Box>
    )
  })
}
