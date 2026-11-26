# Clawd mascot

A Claude Code mod that keeps a little pixel Clawd in a side pane.

- **While Claude works**, he pulls out a laptop, sits down and codes.
- **When Claude is done**, he puts the laptop away and falls asleep, with Zs floating over his head.

He is drawn in vector pixel art, whole pixels only, and stands on the bottom edge of the pane.

## Install

The easiest way: paste this into Claude (the desktop app's Code tab, or Claude Code in a terminal) and press Enter. Claude installs the mod and explains how to use it.

```
Install the Clawd mascot mod for Claude Code: run in the shell
claude plugin install mascot --marketplace matviiiiiiiiiiiiiii/clawd-mascot
Then show me the instructions from https://github.com/matviiiiiiiiiiiiiii/clawd-mascot#how-to-use word for word, as they are written.
```

Or run it yourself in Terminal:

```bash
claude plugin install mascot --marketplace matviiiiiiiiiiiiiii/clawd-mascot
```

Clawd appears on the right within a few seconds. If he doesn't, fully quit the Claude app (Cmd+Q), open it again and start a new chat.

## How to use

Clawd is a little pixel mascot in a narrow panel on the right of the chat. While Claude works on your request, he takes out a laptop and types. When Claude is done, he puts the laptop away and falls asleep. He is just for fun: he changes nothing about how Claude works.

Type these commands in the message box, like a normal message, and press Enter:

| Command | What it does |
| --- | --- |
| `/mascot off` | Hides Clawd everywhere, in this chat and in new ones, until you type `/mascot on`. Nothing is deleted; he just waits until you call him back. |
| `/mascot on` | Shows the panel with Clawd again. |
| `/mascot` | Switches: if Clawd is showing, it hides him; if he is hidden, it shows him. |
| `/mascot help` | Shows these instructions in the chat. |

The **×** on the panel hides Clawd only in this chat. In your next chat he is back.

To switch the mod off completely, disable the plugin: in the desktop app under **Plugins**, or from a shell with `claude plugin disable mascot@clawd-mascot` (and `claude plugin enable mascot@clawd-mascot` to bring it back).

## Remove it

Ask Claude: "remove the Clawd mascot mod". Or run in Terminal:

```bash
claude plugin uninstall mascot@clawd-mascot
```

In the desktop app, remove **mascot** under **Plugins**.

## Notes

- Works in the Claude desktop app. In a terminal session the pane shows a one-line status instead of the drawing.
- Unofficial fan mod, not affiliated with or endorsed by Anthropic.

## License

MIT
