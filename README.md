# btch-cli: an open-source terminal coding agent

An open-source terminal coding agent that connects to any OpenAI-compatible endpoint (default: `https://ai.tioo.eu.org/v1`) — **sub-agents on by default**, **remote control via Telegram** (pair once, drive the agent from your phone while the CLI runs), and a terminal UI built with **Bun** and **OpenTUI**.

The model list is **auto-fetched from your endpoint** when the CLI starts, so you always see the models your API actually serves.

---

## Install

**Recommended — one-liner** (no prerequisites, downloads the correct binary for your OS, architecture, and CPU):

```bash
curl -fsSL https://raw.githubusercontent.com/hostinger-bot/btch-cli/main/install.sh | bash
```

What the installer does:

- Detects your OS and architecture (Linux/macOS/Windows, x64/arm64)
- On x64 machines without AVX2 (e.g. older VMs) it automatically downloads the `-baseline` build so the binary runs instead of crashing
- Installs to `~/.btch/bin/` and adds it to your `PATH` (via `~/.bashrc`, `~/.zshrc`, or fish config)
- If it can, it also creates a symlink at `/usr/local/bin/btch` so `btch` works immediately in the current session
- Verifies the download against `checksums.txt`

**Installer options:**

```bash
# Install a specific version
curl -fsSL https://raw.githubusercontent.com/hostinger-bot/btch-cli/main/install.sh | bash -s -- --version 3.0.0

# Install from a local binary instead of downloading
bash install.sh --binary /path/to/btch

# Do not edit shell config files
curl -fsSL https://raw.githubusercontent.com/hostinger-bot/btch-cli/main/install.sh | bash -s -- --no-modify-path
```

**Install from the npm registry** (package is published as [`btch-cli`](https://www.npmjs.com/package/btch-cli) on every release):

```bash
# Bun
bun add -g btch-cli

# npm
npm install -g btch-cli

# pnpm
pnpm add -g btch-cli

# yarn
yarn global add btch-cli
```

> The registry package runs on the **Bun runtime** (the CLI uses `bun:sqlite`),
> so make sure Bun is installed and on your `PATH` before using this option.
> The `install.sh` one-liner above produces a standalone binary that needs no
> runtime at all — prefer it if you don't want Bun installed.

**Prerequisites:** an **API key** for your OpenAI-compatible endpoint and a modern terminal emulator for the interactive OpenTUI experience. Headless `--prompt` mode does not depend on terminal UI support. If you want host desktop automation via the built-in computer sub-agent, also enable **Accessibility** permission for your terminal app on macOS.

---

## Uninstall

**Script-installed btch** (installed via `install.sh`) — remove everything:

```bash
btch uninstall
```

This removes the binary, `~/.btch`, the `/usr/local/bin/btch` symlink, and the PATH entry added to your shell config. It asks for confirmation first.

**Uninstall options:**

```bash
btch uninstall --dry-run      # show what would be removed, without removing anything
btch uninstall --force        # skip the confirmation prompt (for scripts/CI)
btch uninstall --keep-config  # keep ~/.btch config files (user-settings.json, AGENTS.md)
btch uninstall --keep-data    # keep ~/.btch data files (db, models, sessions, ...)
btch uninstall --keep-config --keep-data  # only remove the binary and PATH entry
```

**Installed via `bun add -g`?** Uninstall with your package manager:

```bash
bun remove -g btch-cli
```

**Manual uninstall** (if you installed by hand, or `btch` is no longer available):

```bash
rm -rf ~/.btch
rm -f /usr/local/bin/btch
```

Then remove the `export PATH=$HOME/.btch/bin:$PATH` (or `fish_add_path`) line from your shell config (`~/.bashrc`, `~/.zshrc`, or `~/.config/fish/config.fish`).

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

### Releasing

Releases are driven by the `Release` GitHub Actions workflow: it builds all
binaries, attaches them to the release, and publishes the matching version to
npm — but **you must bump the version yourself** first. Follow these steps in
order:

1. **Bump the version** in `package.json` (semver — `3.0.1` for a patch,
   `3.1.0` for a feature, `4.0.0` for breaking changes).

2. **Update `CHANGELOG.md`** — add a `## [x.y.z] - YYYY-MM-DD` entry at the
   top describing what changed.

3. **Commit and push**:

   ```bash
   git add package.json CHANGELOG.md
   git commit -m "chore: bump version to x.y.z"
   git push
   ```

4. **Create the release** in the GitHub UI
   (`Releases → Draft a new release`): choose the tag `btch-dev@x.y.z`
   (check **Create new tag on publish** if it does not exist yet), point it at
   `main`, write the release notes, and hit **Publish release**.

5. **Verify** the `Release` workflow run (Actions tab) succeeds:
   - builds `btch-linux-x64`, `btch-linux-x64-baseline`, `btch-darwin-arm64`,
     `btch-windows-x64.exe` and attaches them with `checksums.txt`
   - publishes `btch-cli@x.y.z` to npm (requires the `NPM_TOKEN` secret in
     repo settings)

That's it — the version in the tag, the binaries, and the npm package all end
up as the same `x.y.z`.

Alternatively, run the workflow manually from the **Actions** tab
(`Release → Run workflow`) and enter the tag to publish.

---

## License

MIT
