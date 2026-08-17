# btch-cli: an open-source terminal coding agent

An open-source terminal coding agent that connects to any OpenAI-compatible endpoint (default: `https://ai.tioo.eu.org/v1`) — **sub-agents on by default**, **remote control via Telegram** (pair once, drive the agent from your phone while the CLI runs), and a terminal UI built with **Bun** and **OpenTUI**.

The model list is **auto-fetched from your endpoint** when the CLI starts, so you always see the models your API actually serves.

---

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/hostinger-bot/btch-cli/main/install.sh | bash
```

**Alternative installs** (requires Bun on PATH):

```bash
bun add -g btch-cli
```

**Self-management** (script-installed only):

```bash
btch update
btch uninstall
btch uninstall --dry-run
btch uninstall --keep-config
```

**Prerequisites:** an **API key** for your OpenAI-compatible endpoint and a modern terminal emulator for the interactive OpenTUI experience. Headless `--prompt` mode does not depend on terminal UI support. If you want host desktop automation via the built-in computer sub-agent, also enable **Accessibility** permission for your terminal app on macOS.

---

## Run it

**Interactive (default)** — launches the OpenTUI coding agent:

```bash
btch
```

### Supported terminals

For the most reliable interactive OpenTUI experience, use a modern terminal emulator. We currently document and recommend:

- **WezTerm** (cross-platform)
- **Alacritty** (cross-platform)
- **Ghostty** (macOS and Linux)
- **Kitty** (macOS and Linux)

Other modern terminals may work, but these are the terminal apps we currently recommend and document for interactive use.

**Pick a project directory:**

```bash
btch -d /path/to/your/repo
```

**Headless** — one prompt, then exit (scripts, CI, automation):

```bash
btch --prompt "run the test suite and summarize failures"
btch -p "show me package.json" --directory /path/to/project
btch --prompt "refactor X" --max-tool-rounds 30
btch --prompt "summarize the repo state" --format json
btch --verify
```

**Continue a saved session:**

```bash
btch --session latest
btch -s <session-id>
```

Works in interactive mode too—same flag.

**Structured headless output:**

```bash
btch --prompt "summarize the repo state" --format json
```

`--format json` emits a newline-delimited JSON event stream instead of the
default human-readable text output. Events are semantic, step-level records such
as `step_start`, `text`, `tool_use`, `step_finish`, and `error`.

### Computer sub-agent

btch ships a built-in `**computer**` sub-agent backed by `[agent-desktop](https://github.com/lahfir/agent-desktop)` for host desktop automation on macOS.

Ask for it in natural language, for example:

```bash
btch "Use the computer sub-agent to take a screenshot of my host desktop and tell me what is open."
btch "Use the computer sub-agent to launch Google Chrome, snapshot the UI, and tell me which refs correspond to the address bar and tabs."
```

Notes:

- Screenshots are saved under `**.btch/computer/**` by default.
- The primary workflow is **snapshot -> refs -> action -> snapshot** using `agent-desktop` accessibility snapshots and stable refs like `@e1`.
- `computer_screenshot` is available for visual confirmation, but the preferred path is `computer_snapshot` plus ref-based actions such as `computer_click`, `computer_type`, and `computer_scroll`.
- macOS requires **System Settings → Privacy & Security → Accessibility** access for the terminal app running `btch`.
- `agent-desktop` currently targets **macOS**.
- If Bun blocks the native binary download during install, run:

```bash
node ./node_modules/agent-desktop/scripts/postinstall.js
```

### Scheduling

Schedules let btch run a headless prompt on a recurring schedule or once. Ask
for it in natural language, for example:

```text
Create a schedule named daily-changelog-update that runs every weekday at 9am
and updates CHANGELOG.md from the latest merged commits.
```

Recurring schedules require the background daemon:

```bash
btch daemon --background
```

Use `/schedule` in the TUI to browse saved schedules. One-time schedules start
immediately in the background; recurring schedules keep running as long as the
daemon is active.

**List models served by your endpoint:**

```bash
btch models
```

The model list is **auto-fetched from the endpoint on every open**: at CLI
startup and every time you run `btch models` or type `/models` in the TUI, so
new models appear in real time without restarting or editing config.

**Pass an opening message without another prompt:**

```bash
btch fix the flaky test in src/foo.test.ts
```

---

## What you actually get


| Thing                             | What it means                                                                                                                                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Any OpenAI-compatible endpoint**| Defaults to `https://ai.tioo.eu.org/v1`; point `BTCH_BASE_URL` anywhere compatible. Models are auto-fetched from `/v1/models` on startup.                                                                                  |
| **Sub-agents (default behavior)** | Foreground `**task`** delegation (e.g. explore, general, or computer) plus background `**delegate`** for read-only deep dives—parallelize like you mean it.                                                                |
| **Verify**                        | `**/verify`** or `**--verify`** — inspects your app, builds, tests, boots it, and runs browser smoke checks in a sandboxed environment. Screenshots and video included.                                                    |
| **Computer use**                  | Built-in `**computer`** sub-agent for host desktop automation via `**agent-desktop`**. It prefers semantic accessibility snapshots and stable refs, with screenshots saved under `**.btch/computer/**` when requested.     |
| **Custom sub-agents**             | Define named agents with `**subAgents`** in `**~/.btch/user-settings.json`** and manage them from the TUI with `**/agents**`.                                                                                              |
| **Remote control**                | Pair **Telegram** from the TUI (`/remote-control` → Telegram): DM your bot, `**/pair`**, approve the code in-terminal. Keep the CLI running while you ping it from your phone.                                             |
| **No “mystery meat” UI**          | OpenTUI React terminal UI—fast, keyboard-driven, not whatever glitchy thing you’re thinking of.                                                                                                                            |
| **Skills**                        | Agent Skills under `**.agents/skills/<name>/SKILL.md`** (project) or `**~/.agents/skills/`** (user). Use `**/skills**` in the TUI to list what’s installed.                                                                |
| **MCPs**                          | Extend with Model Context Protocol servers—configure via `**/mcps**` in the TUI or `**.btch/settings.json`** (`mcpServers`).                                                                                               |
| **Sessions**                      | Conversations persist; `**--session latest`** picks up where you left off.                                                                                                                                                 |
| **Headless**                      | `**--prompt`** / `**-p`** for non-interactive runs—pipe it, script it, bench it.                                                                                                                                           |
| **Hackable**                      | TypeScript, clear agent loop, bash-first tools—fork it, shamelessly.                                                                                                                                                       |


### Coming soon

**Deeper autonomous agent testing** — persistent sandbox sessions, richer browser workflows, and stronger "prove it works" evidence.

---

## API key (pick one)

**Environment (good for CI):**

```bash
export BTCH_API_KEY=your_key_here
```

`**.env**` in the project (see `.env.example` if present):

```bash
BTCH_API_KEY=your_key_here
```

**CLI once:**

```bash
btch -k your_key_here
```

**Saved in user settings** — `~/.btch/user-settings.json`:

```json
{ "apiKey": "your_key_here" }
```

Optional `**subAgents**` — custom foreground sub-agents. Each entry needs `**name**`, `**model**`, and `**instruction**`:

```json
{
  "subAgents": [
    {
      "name": "security-review",
      "model": "deepseek-v4-flash",
      "instruction": "Prioritize security implications and suggest concrete fixes."
    }
  ]
}
```

Names cannot be `general`, `explore`, `vision`, `verify`, or `computer` because those are reserved for the built-in sub-agents.

Optional: `**BTCH_BASE_URL**` (default `https://ai.tioo.eu.org/v1`), `**BTCH_MODEL**`, `**BTCH_MAX_TOKENS**`.

---

## Telegram (remote control) — short version

1. Create a bot with [@BotFather](https://t.me/BotFather), copy the token.
2. Set `**TELEGRAM_BOT_TOKEN**` or add `**telegram.botToken**` in `~/.btch/user-settings.json` (the TUI `**/remote-control**` flow can save it).
3. Start `**btch**`, open `**/remote-control**` → **Telegram** if needed, then in Telegram DM your bot: `**/pair`**, enter the **6-character code** in the terminal when asked.
4. First user must be approved once; after that, it’s remembered. **Keep the CLI process running** while you use the bot (long polling lives in that process).

Optional headless flow when you do not want the TUI open:

```bash
btch telegram-bridge
```

Treat the bot token like a password.

---

## Hooks

Hooks execute shell commands at key agent lifecycle events — enforce policies, run linters, trigger tests, or log activity.

Configure in `~/.btch/user-settings.json`:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "bash",
        "hooks": [
          {
            "type": "command",
            "command": "./scripts/lint-before-edit.sh",
            "timeout": 10
          }
        ]
      }
    ]
  }
}
```

Hook commands receive JSON on **stdin** (event details) and can return JSON on **stdout**. Exit code `0` = success, `2` = block the action, other = non-blocking error.

**Supported events:** `PreToolUse`, `PostToolUse`, `PostToolUseFailure`, `UserPromptSubmit`, `SessionStart`, `SessionEnd`, `Stop`, `StopFailure`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `PreCompact`, `PostCompact`, `Notification`, `InstructionsLoaded`, `CwdChanged`.

---

## Instructions & project brain

- `**AGENTS.md`** — merged from git root down to your cwd (Codex-style; see repo docs). `**AGENTS.override.md**` wins per directory when present.

---

## Project settings

Project file: `**.btch/settings.json**` — e.g. the current model for this project.

---

## Sandbox

btch-cli can run shell commands inside a [Shuru](https://github.com/superhq-ai/shuru) microVM sandbox so the agent can't touch your host filesystem or network.

**Requires macOS 14+ on Apple Silicon.**

Enable it with `--sandbox` on the CLI, or toggle it from the TUI with `/sandbox`.

On the first interactive run in a new directory, btch asks whether to remember sandbox or host mode for that workspace and stores the choice in `~/.btch/workspace-trust.json`. Explicit `--sandbox` / `--no-sandbox` flags and non-interactive commands keep their current behavior.

When sandbox mode is active you can configure:

- **Network** — off by default; enable with `--allow-net`, restrict with `--allow-host`
- **Port forwards** — `--port 8080:80`
- **Resource limits** — CPUs, memory, disk size (via settings or `/sandbox` panel)
- **Checkpoints** — start from a saved environment snapshot
- **Secrets** — inject API keys without exposing them inside the VM

All settings are saved in `~/.btch/user-settings.json` (user) and `.btch/settings.json` (project).

### Verify

Run `**/verify`** in the TUI or `**--verify`** on the CLI to verify your app locally:

```bash
btch --verify
btch -d /path/to/your/app --verify
```

The agent inspects your project, figures out how to build and run it, spins up a sandbox, and produces a verification report with screenshots and video evidence. Works with any app type.

---

## Troubleshooting

Common issues and solutions:

### Installation issues

**Install script fails on macOS**

Make sure you have a modern shell and `curl` available:

```bash
# Verify curl is installed
which curl

# If using an outdated shell, try with bash explicitly
bash -c "$(curl -fsSL https://raw.githubusercontent.com/hostinger-bot/btch-cli/main/install.sh)"
```

**Bun not found**

The install script bundles Bun, but if you want to use your own:

```bash
curl -fsSL https://bun.sh/install | bash
bun add -g btch-cli
```

### API key issues

**"Missing BTCH_API_KEY" error**

Set your API key using one of these methods:

```bash
# Environment variable
export BTCH_API_KEY=your_key_here

# Or save to user settings
btch -k your_key_here
```

Get your API key from your OpenAI-compatible endpoint provider.

### Terminal UI issues

**Strange text like `Gi=31337,s=1,v=1,a=q,t=d,f=24;AAAA` appears when running inside tmux**

This is a known upstream issue in the TUI library ([opentui #334](https://github.com/anomalyco/opentui/issues/334)): OpenTUI sends a Kitty graphics protocol detection query, and inside tmux the terminal's response leaks into the pane as raw text. btch disables this detection by default (`OPENTUI_GRAPHICS=false`), but if you still see it, force it in your shell:

```bash
export OPENTUI_GRAPHICS=false
```

or add it to your `tmux.conf`:

```text
set -as terminal-features ',*:RGB'
```

**UI doesn't render correctly**

Try a different terminal emulator. Recommended:

- WezTerm (cross-platform)
- Alacritty (cross-platform)
- Ghostty (macOS/Linux)
- Kitty (macOS/Linux)

**Screen flickering or artifacts**

Ensure your terminal supports true color and Unicode. Update your terminal emulator to the latest version.

### Telegram remote control

**Bot doesn't respond**

1. Verify `TELEGRAM_BOT_TOKEN` is set correctly
2. Ensure the CLI process is still running (long polling lives in the process)
3. Check that you've completed the `/pair` flow and been approved

### Sandbox mode

**Sandbox only works on macOS 14+ with Apple Silicon**

If you're on Intel Mac or Linux, sandbox mode is not available. Use standard mode without `--sandbox`.

### Performance issues

**Slow response times**

- Check your network connection to the API endpoint
- Pick a faster model from the auto-fetched model list
- Reduce `--max-tool-rounds` for headless runs

**High memory usage**

- Long-running sessions accumulate context; start a fresh session periodically
- Use `/compact` in TUI to compress conversation history

### Getting help

- Check existing [issues](https://github.com/hostinger-bot/btch-cli/issues)
- Open a new issue with:
  - OS and terminal emulator version
  - btch version (`btch --version`)
  - Steps to reproduce
  - Error messages or logs

---

## Development

From a clone:

```bash
bun install
bun run build
bun run start
# or: node dist/index.js
```

Other useful commands:

```bash
bun run dev      # run from source (Bun)
bun run typecheck
bun run lint
```

---

## License

MIT
