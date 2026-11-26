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
// (1.1.0 to 1.2.1 marked it shown without it reaching a seen chat: a new key
// shows it once more to those who installed them.)
const WELCOMED_KEY = 'welcomed-4'
const HELP = [
  'Clawd mascot is installed.',
  '',
  'What it is: Clawd is a little pixel mascot in a narrow panel on the right of the chat. While Claude works on your request, he takes out a laptop and types. When Claude is done, he puts the laptop away and falls asleep. He is just for fun: he changes nothing about how Claude works.',
  '',
  'Commands (type them in the message box, like a normal message, and press Enter):',
  '• /mascot off: hides Clawd everywhere, in this chat and in new ones, until you type /mascot on. Nothing is deleted; he just waits until you call him back.',
  '• /mascot on: shows the panel with Clawd again.',
  '• /mascot: switches. If Clawd is showing, it hides him; if he is hidden, it shows him.',
  '• /mascot help: shows these instructions again.',
  '',
  'The × on the panel hides Clawd only in this chat. In your next chat he is back.',
  '',
  'To remove the mod completely: ask Claude "remove the Clawd mascot mod", or run in Terminal: claude plugin uninstall mascot@clawd-mascot',
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

// Only in a session a person is looking at (the pane was placed on a screen)
// and only once its conversation has begun: the desktop app starts a session
// before its first message, and a row added then is never saved. Installed
// from a chat, the mod loads into that chat, which has begun: the note comes
// at once. In a fresh session it waits for the first message.
let pending = false
const hasBegun = async ($: Pick<CoreEngineInterface, 'session'>) => {
  const rows = await $.session.messages().catch(() => undefined)

  return Array.isArray(rows) && rows.length > 0
}
const welcomeWhereSeen = async (
  $: Pick<CoreEngineInterface, 'session' | 'store'>,
  opened: { isPlaced: boolean } | undefined,
) => {
  if (opened?.isPlaced !== true) return
  if (await hasBegun($)) await welcome($)
  else pending = true
}

// Closed with the pane's × in this session: he stays away for the rest of it
// and comes back in the next one. Each session runs its own copy of the mod.
let closedHere = false
const shouldShow = async ($: Pick<CoreEngineInterface, 'store'>) => !closedHere && !(await isOff($))

export const register: Register = on => {
  // `/mascot off` hides him everywhere until `/mascot on` (remembered across
  // sessions); the pane's × hides him only in this session.
  on('session.start', async ($, e, next) => {
    await update($, state, now => ({ ...now, phase: 'sleep' as Phase, since: 0, prev: null }))
    await $.command.register({
      name: 'mascot',
      description: 'Show or hide the Clawd pane (/mascot on, /mascot off, /mascot help)',
    })
    const opening = (await shouldShow($)) ? open($).catch(() => undefined) : undefined
    const ran = await next(e)
    await welcomeWhereSeen($, await opening)

    return ran
  })

  on('session.attach', async ($, e, next) => {
    const ran = await next(e)
    if (await shouldShow($)) await welcomeWhereSeen($, await open($).catch(() => undefined))

    return ran
  })

  on('command.run', { command: 'mascot' }, async ($, e) => {
    const arg = e.args.trim().toLowerCase()
    if (arg === 'help') {
      return { text: HELP }
    }
    const turnOn = arg === 'on' ? true : arg === 'off' ? false : !(await shouldShow($))
    await $.store.set(OFF_KEY, !turnOn)
    if (turnOn) {
      closedHere = false
      await open($)

      return { text: 'Clawd is on. /mascot off hides him.' }
    }
    await $.ui.close({ id: PANE })

    return { text: 'Clawd is off, in new chats too. /mascot on brings him back.' }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE && e.origin.kind === 'person') closedHere = true
    // What the last close was, kept so a close that never arrives shows up.
    void $.store.set('last-close', `${e.id}:${e.origin.kind}`).catch(() => undefined)

    return next(e)
  })

  on('turn.start', async ($, e, next) => {
    if (e.agentId === undefined && pending) {
      pending = false
      await welcome($)
    }
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
