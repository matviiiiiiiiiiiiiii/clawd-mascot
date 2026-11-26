# Clawd mascot

A Claude Code mod that keeps a little pixel Clawd in a side pane.

- **While Claude works**, he pulls out a laptop, sits down and codes.
- **When Claude is done**, he puts the laptop away and falls asleep, with Zs floating over his head.

He is drawn in vector pixel art, whole pixels only, and stands on the bottom edge of the pane.

## Install

At the prompt of a Claude Code session in a terminal:

```
/plugin install mascot --marketplace matviiiiiiiiiiiiiii/clawd-mascot
```

Answer `y` to add the marketplace, then pick a scope (user scope puts him in every session).

From a shell:

```bash
claude plugin install mascot --marketplace matviiiiiiiiiiiiiii/clawd-mascot
```

In the Claude desktop app, where `/plugin` does not run: click **+** next to the prompt box, then **Plugins**, **Add marketplace** with `matviiiiiiiiiiiiiii/clawd-mascot`, then **Add plugin**.

## Turn him on and off

| Do this | What happens |
| --- | --- |
| `/mascot` | Shows him if he is hidden, hides him if he is shown |
| `/mascot on` | Shows the pane |
| `/mascot off` | Hides the pane |
| Close the pane with its **×** | Hides him (same as `/mascot off`) |

Your choice is remembered across sessions.

To switch the mod off completely, disable the plugin: in the desktop app under **Plugins**, or from a shell with `claude plugin disable mascot@clawd-mascot` (and `claude plugin enable mascot@clawd-mascot` to bring it back).

## Notes

- Works in the Claude desktop app. In a terminal session the pane shows a one-line status instead of the drawing.
- Unofficial fan mod, not affiliated with or endorsed by Anthropic.

## License

MIT
