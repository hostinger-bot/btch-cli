// Downloads an OpenTUI platform package tarball straight from the npm registry
// and extracts it into node_modules, bypassing npm's os/cpu platform check.
//
// Usage:
//   node scripts/install-opentui-platform.mjs <platform-package-name>
//
// e.g. node scripts/install-opentui-platform.mjs @opentui/core-linux-arm64
//
// Why this is needed: OpenTUI loads its native engine from
// `@opentui/core-${process.platform}-${process.arch}/index.ts`. On Android
// (Termux) npm skips installing the linux-arm64 optional dependency because
// Node.js reports platform "android" while the package declares os:["linux"].
// For the same reason, `bun install` on an x64 build host skips the arm64
// package, which breaks cross-compiling `bun build --compile
// --target=bun-linux-arm64` (Bun tries to bundle the platform module at build
// time).
//
// We do NOT shell out to `npm install --force`: under npm's postinstall env
// (npm_config_global/npm_config_prefix) a nested install would target the
// global prefix instead of the package's own node_modules.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, sep } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageRoot = join(__dirname, "..");

const platformPkg = process.argv[2];
if (!platformPkg) {
  console.error("Usage: node scripts/install-opentui-platform.mjs <platform-package-name>");
  process.exit(1);
}

// Find a package inside node_modules the same way npm resolves it: walk up
// from the package root so this also works when dependencies are hoisted to
// the global node_modules root instead of nested under btch-cli. (Plain
// require.resolve can't be used: @opentui/core has an "exports" field that
// blocks resolving its package.json.)
function findPackageJson(name) {
  let dir = packageRoot;
  for (;;) {
    const candidate = join(dir, "node_modules", ...name.split("/"), "package.json");
    if (existsSync(candidate)) return candidate;
    const parent = dir.slice(0, dir.lastIndexOf(sep));
    if (parent === dir || !parent) return null;
    dir = parent;
  }
}

// Derive the version from the installed @opentui/core so it always matches.
const corePkgPath = findPackageJson("@opentui/core");
if (!corePkgPath) {
  console.error(`[btch-cli] @opentui/core not found in node_modules — run bun install first.`);
  process.exit(1);
}
const coreVersion = JSON.parse(readFileSync(corePkgPath, "utf8")).version;

// Already present?
const targetDir = join(packageRoot, "node_modules", ...platformPkg.split("/"));
if (existsSync(join(targetDir, "package.json"))) {
  console.log(`[btch-cli] ${platformPkg}@${coreVersion} already installed.`);
  process.exit(0);
}

// Honor a custom npm registry if one is configured.
let registry = "https://registry.npmjs.org";
try {
  const configured = execFileSync("npm", ["config", "get", "registry"], {
    encoding: "utf8",
    timeout: 15000,
  }).trim();
  if (configured && configured !== "undefined") registry = configured.replace(/\/$/, "");
} catch {
  // keep default
}

const scoped = platformPkg.replace("/", "%2f");
const tarballUrl = `${registry}/${scoped}/-/${platformPkg.split("/")[1]}-${coreVersion}.tgz`;

console.log(`[btch-cli] Installing ${platformPkg}@${coreVersion} from ${registry}...`);

const tmpTarball = join(tmpdir(), `opentui-platform-${Date.now()}.tgz`);
try {
  const res = await fetch(tarballUrl);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${tarballUrl}`);
  const bytes = Buffer.from(await res.arrayBuffer());
  writeFileSync(tmpTarball, bytes);

  mkdirSync(targetDir, { recursive: true });
  // The tarball wraps everything under package/, so strip that first segment.
  execFileSync("tar", ["-xzf", tmpTarball, "-C", targetDir, "--strip-components=1"], {
    stdio: "inherit",
  });
  rmSync(tmpTarball, { force: true });
  console.log(`[btch-cli] Installed ${platformPkg}@${coreVersion}.`);
} catch (err) {
  rmSync(tmpTarball, { force: true });
  console.error(
    `[btch-cli] Warning: could not auto-install ${platformPkg}: ${err instanceof Error ? err.message : String(err)}. ` +
      `You can install it manually with:\n` +
      `  npm install --force ${platformPkg}@${coreVersion}`,
  );
  process.exit(1);
}
