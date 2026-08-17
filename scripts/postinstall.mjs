// npm postinstall hook for btch-cli.
//
// On Android/Termux, npm skips installing OpenTUI's native linux-arm64 package
// because Node.js reports process.platform === "android" while the package
// declares os:["linux"]. At runtime Bun reports platform "linux", so the
// interactive TUI fails with "Cannot find module
// '@opentui/core-linux-arm64/index.ts'". This hook installs the package
// explicitly. It is a no-op everywhere else.
import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

if (process.platform === "android" && process.arch === "arm64") {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const script = join(__dirname, "install-opentui-platform.mjs");
  const res = spawnSync(process.execPath, [script, "@opentui/core-linux-arm64"], {
    stdio: "inherit",
  });
  process.exit(res.status ?? 1);
}
