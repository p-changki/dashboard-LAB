import { mkdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const APP_NAME = "dashboard-LAB Dev.app";
const repoRoot = path.resolve(new URL("..", import.meta.url).pathname);
const applicationsDir = path.join(os.homedir(), "Applications");
const appBundleDir = path.join(applicationsDir, APP_NAME);
const logDir = path.join(os.homedir(), "Library", "Logs");
const launchLogPath = path.join(logDir, "dashboard-lab-launch.log");

if (process.platform !== "darwin") {
  console.error("[dashboard-lab] macOS launcher install is only supported on macOS.");
  process.exit(1);
}

const osacompileCheck = spawnSync("sh", ["-lc", "command -v osacompile >/dev/null 2>&1"], {
  stdio: "ignore",
});

if (osacompileCheck.status !== 0) {
  console.error("[dashboard-lab] osacompile is required to create the launcher app.");
  process.exit(1);
}

await mkdir(applicationsDir, { recursive: true });
await mkdir(logDir, { recursive: true });
await rm(appBundleDir, { recursive: true, force: true });

const launchCommand = [
  "cd",
  shellQuote(repoRoot),
  "&&",
  "nohup",
  process.execPath,
  shellQuote(path.join(repoRoot, "scripts/launch-local.mjs")),
  ">>",
  shellQuote(launchLogPath),
  "2>&1",
  "&",
].join(" ");

const script = `
on run
  set repoRoot to ${appleScriptString(repoRoot)}
  set packageJsonPath to repoRoot & "/package.json"
  set nodeModulesPath to repoRoot & "/node_modules"
  try
    do shell script "test -f " & quoted form of packageJsonPath
  on error
    display dialog "dashboard-LAB repository was not found at " & repoRoot buttons {"OK"} default button "OK" with icon caution
    return
  end try

  try
    do shell script "test -d " & quoted form of nodeModulesPath
  on error
    display dialog "Dependencies are missing. Run Run-Dashboard-LAB.command once before using this launcher." buttons {"OK"} default button "OK" with icon caution
    return
  end try

  try
    do shell script ${appleScriptString(`/bin/bash -lc ${shellQuote(launchCommand)}`)}
  on error errMsg
    display dialog "dashboard-LAB could not start. Check ~/Library/Logs/dashboard-lab-launch.log\\n\\n" & errMsg buttons {"OK"} default button "OK" with icon caution
    return
  end try
end run
`.trim();

const compile = spawnSync("osacompile", ["-o", appBundleDir, "-e", script], {
  stdio: "inherit",
});

if (compile.status !== 0) {
  process.exit(compile.status ?? 1);
}

console.log(`[dashboard-lab] macOS launcher created at ${appBundleDir}`);
console.log("[dashboard-lab] You can now start dashboard-LAB by double-clicking the app in ~/Applications.");

function shellQuote(value) {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

function appleScriptString(value) {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}
