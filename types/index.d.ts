export type Phase = 'sleep' | 'work' | 'rest'

/** The clip on screen: which phase and when it began (its mount key). */
export type Shown = { phase: Phase; since: number }

export type MascotState = {
  phase: Phase
  since: number
  /** The clip just replaced, kept under the new one while that one loads. */
  prev: Shown | null
}

declare module 'claude-code' {
  interface PluginState {
    mascot: { state: Shaped<MascotState> }
  }
}
