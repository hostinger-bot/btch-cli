import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildScriptUninstallPlan,
  getInstallMetadataPath,
  getReleaseTargetForPlatform,
  getScriptInstallContext,
  getScriptInstallDir,
  loadScriptInstallMetadata,
  parseChecksumsFile,
  saveScriptInstallMetadata,
} from "./install-manager";

let tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs) fs.rmSync(dir, { recursive: true, force: true });
  tempDirs = [];
});

function createTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

describe("getReleaseTargetForPlatform", () => {
  it("maps supported platforms to release asset names", () => {
    expect(getReleaseTargetForPlatform("darwin", "arm64")?.assetName).toBe("btch-darwin-arm64");
    expect(getReleaseTargetForPlatform("darwin", "x64")?.assetName).toBe("btch-darwin-arm64");
    expect(getReleaseTargetForPlatform("linux", "x64")?.assetName).toBe("btch-linux-x64");
    expect(getReleaseTargetForPlatform("win32", "x64")?.assetName).toBe("btch-windows-x64.exe");
    expect(getReleaseTargetForPlatform("linux", "arm64")).toBeNull();
  });
});

describe("parseChecksumsFile", () => {
  it("parses standard and BSD-style checksum entries", () => {
    const checksums = parseChecksumsFile(
      [
        "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa  btch-darwin-arm64",
        "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb *btch-windows-x64.exe",
      ].join("\n"),
    );
    expect(checksums.get("btch-darwin-arm64")).toBe("aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa");
    expect(checksums.get("btch-windows-x64.exe")).toBe(
      "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    );
  });
});

describe("script install metadata", () => {
  it("round-trips metadata through write and load", () => {
    const homeDir = createTempDir("btch-meta-");
    const installDir = getScriptInstallDir(homeDir);
    const metadata = {
      schemaVersion: 1,
      installMethod: "script" as const,
      version: "1.2.3",
      repo: "hostinger-bot/btch-cli",
      binaryPath: path.join(installDir, "btch"),
      installDir,
      assetName: "btch-darwin-arm64",
      target: "darwin-arm64" as const,
      installedAt: "2026-04-03T00:00:00.000Z",
      shellConfigPath: path.join(homeDir, ".zshrc"),
      pathCommand: `export PATH=${installDir}:$PATH`,
    };

    saveScriptInstallMetadata(metadata, homeDir);
    expect(loadScriptInstallMetadata(homeDir)).toEqual(metadata);
    expect(fs.existsSync(getInstallMetadataPath(homeDir))).toBe(true);
  });

  it("returns null when no metadata file exists", () => {
    expect(loadScriptInstallMetadata(createTempDir("btch-empty-"))).toBeNull();
  });
});

describe("getScriptInstallContext", () => {
  it("returns context when metadata exists", () => {
    const homeDir = createTempDir("btch-ctx-");
    const installDir = getScriptInstallDir(homeDir);
    const currentTarget = getReleaseTargetForPlatform();
    expect(currentTarget).not.toBeNull();

    saveScriptInstallMetadata(
      {
        schemaVersion: 1,
        installMethod: "script" as const,
        version: "1.2.3",
        repo: "hostinger-bot/btch-cli",
        binaryPath: path.join(installDir, currentTarget!.binaryName),
        installDir,
        assetName: currentTarget!.assetName,
        target: currentTarget!.key,
        installedAt: "2026-04-03T00:00:00.000Z",
      },
      homeDir,
    );

    const ctx = getScriptInstallContext(homeDir);
    expect(ctx?.metadata.installMethod).toBe("script");
    expect(ctx?.binaryPath).toBe(path.join(installDir, currentTarget!.binaryName));
  });

  it("returns null when no metadata exists", () => {
    expect(getScriptInstallContext(createTempDir("btch-no-ctx-"))).toBeNull();
  });
});

describe("buildScriptUninstallPlan", () => {
  it("removes the full ~/.btch directory by default", () => {
    const homeDir = createTempDir("btch-uninstall-");
    const installDir = getScriptInstallDir(homeDir);
    const currentTarget = getReleaseTargetForPlatform()!;
    fs.mkdirSync(installDir, { recursive: true });

    saveScriptInstallMetadata(
      {
        schemaVersion: 1,
        installMethod: "script" as const,
        version: "1.2.3",
        repo: "hostinger-bot/btch-cli",
        binaryPath: path.join(installDir, currentTarget.binaryName),
        installDir,
        assetName: currentTarget.assetName,
        target: currentTarget.key,
        installedAt: "2026-04-03T00:00:00.000Z",
      },
      homeDir,
    );

    const plan = buildScriptUninstallPlan({}, homeDir);
    expect(plan?.removePaths).toContain(path.join(homeDir, ".btch"));
  });

  it("removes the global symlink when recorded in metadata", () => {
    const homeDir = createTempDir("btch-symlink-");
    const installDir = getScriptInstallDir(homeDir);
    const currentTarget = getReleaseTargetForPlatform()!;
    fs.mkdirSync(installDir, { recursive: true });

    saveScriptInstallMetadata(
      {
        schemaVersion: 1,
        installMethod: "script" as const,
        version: "1.2.3",
        repo: "hostinger-bot/btch-cli",
        binaryPath: path.join(installDir, currentTarget.binaryName),
        installDir,
        assetName: currentTarget.assetName,
        target: currentTarget.key,
        installedAt: "2026-04-03T00:00:00.000Z",
        globalBinPath: "/usr/local/bin/btch",
      },
      homeDir,
    );

    const plan = buildScriptUninstallPlan({}, homeDir);
    expect(plan?.removePaths).toContain("/usr/local/bin/btch");
  });

  it("keeps config and data when requested", () => {
    const homeDir = createTempDir("btch-keep-");
    const installDir = getScriptInstallDir(homeDir);
    const currentTarget = getReleaseTargetForPlatform()!;
    fs.mkdirSync(installDir, { recursive: true });

    saveScriptInstallMetadata(
      {
        schemaVersion: 1,
        installMethod: "script" as const,
        version: "1.2.3",
        repo: "hostinger-bot/btch-cli",
        binaryPath: path.join(installDir, currentTarget.binaryName),
        installDir,
        assetName: currentTarget.assetName,
        target: currentTarget.key,
        installedAt: "2026-04-03T00:00:00.000Z",
      },
      homeDir,
    );

    const plan = buildScriptUninstallPlan({ keepConfig: true, keepData: true }, homeDir);
    expect(plan?.removePaths).not.toContain(path.join(homeDir, ".btch"));
    expect(plan?.removePaths).toContain(path.join(installDir, currentTarget.binaryName));
  });
});
