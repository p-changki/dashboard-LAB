import { readdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import type {
  AppCategory,
  InstalledApp,
  ProcessCategory,
  ProcessInfo,
  ProcessResponse,
  SystemInfo,
} from "@/lib/types";

import { readThroughCache } from "./cache";
import { getPortUsage } from "./projects-extended-parser";
import { formatBytes, runShellCommand, toPosixPath } from "./shared";

const SYSTEM_INFO_CACHE_TTL_MS = 10_000;
const PROCESS_CACHE_TTL_MS = 10_000;
const INSTALLED_APPS_CACHE_TTL_MS = 5 * 60 * 1000;

const APP_CATEGORIES: Record<string, AppCategory> = {
  "Visual Studio Code": "development",
  Cursor: "development",
  Docker: "development",
  Postman: "development",
  iTerm: "development",
  Warp: "development",
  "Google Chrome": "browser",
  Safari: "browser",
  Arc: "browser",
  Firefox: "browser",
  Notion: "productivity",
  Obsidian: "productivity",
  Slack: "productivity",
  Discord: "productivity",
  Figma: "design",
  Sketch: "design",
  Spotify: "media",
};

export async function getSystemInfo(): Promise<SystemInfo> {
  return readThroughCache("system-info", SYSTEM_INFO_CACHE_TTL_MS, loadSystemInfo);
}

export async function getProcesses(): Promise<ProcessResponse> {
  const [processes, ports] = await Promise.all([
    readThroughCache("system-processes", PROCESS_CACHE_TTL_MS, loadProcesses),
    getPortUsage(),
  ]);

  return {
    processes,
    summary: {
      totalProcesses: processes.length,
      totalCpu: processes.reduce((sum, item) => sum + item.cpu, 0),
      totalMemory: formatBytes(
        processes.reduce((sum, item) => sum + item.memory * 1024 * 1024, 0),
      ),
      byCategory: countProcessCategories(processes),
    },
    devPorts: ports.ports,
  };
}

export async function getInstalledApps() {
  return readThroughCache("system-apps", INSTALLED_APPS_CACHE_TTL_MS, loadApps);
}

async function loadSystemInfo(): Promise<SystemInfo> {
  const [cpuModel, cpuCores, topSnapshot, memSize, vmStat, disk, localIp, uptime] =
    await Promise.all([
      runShellCommand("sysctl -n machdep.cpu.brand_string"),
      runShellCommand("sysctl -n hw.ncpu"),
      runShellCommand("top -l 1"),
      runShellCommand("sysctl -n hw.memsize"),
      runShellCommand("vm_stat"),
      runShellCommand("df -k / | tail -1"),
      runShellCommand("ipconfig getifaddr en0"),
      runShellCommand("uptime"),
    ]);
  const memory = parseMemory(memSize, topSnapshot, vmStat);
  const diskInfo = parseDisk(disk);

  return {
    hostname: os.hostname(),
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cpu: {
      model: cpuModel || "unknown",
      cores: Number(cpuCores || 0),
      usage: parseCpuUsage(topSnapshot),
    },
    memory,
    disk: diskInfo,
    uptime: uptime.trim(),
    network: { localIP: localIp || "127.0.0.1", publicIP: null },
  };
}

async function loadProcesses(): Promise<ProcessInfo[]> {
  const output = await runShellCommand(
    "ps -axo pid=,comm=,%cpu=,rss=,%mem=,user=,start=,command= -r | head -50",
  );

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseProcessLine(line))
    .filter((item): item is ProcessInfo => item !== null);
}

function parseProcessLine(line: string): ProcessInfo | null {
  const parts = line.trim().split(/\s+/);
  const pid = Number(parts[0]);
  const name = parts[1] ?? "unknown";
  const cpu = Number(parts[2] ?? "0");
  const memoryKb = Number(parts[3] ?? "0");
  const memoryPercent = Number(parts[4] ?? "0");
  const user = parts[5] ?? "";
  const startTime = parts[6] ?? "";
  const command = parts.slice(7).join(" ").slice(0, 80);

  if (!Number.isFinite(pid)) {
    return null;
  }

  return {
    pid,
    name,
    cpu,
    memory: Number((memoryKb / 1024).toFixed(1)),
    memoryPercent,
    user,
    startTime,
    command,
    category: categorizeProcess(name),
  };
}

async function loadApps() {
  const appPaths = ["/Applications", "/System/Applications"];
  const apps = await Promise.all(appPaths.map((appPath) => scanAppDirectory(appPath)));
  return { apps: apps.flat().sort((left, right) => left.name.localeCompare(right.name)) };
}

async function scanAppDirectory(directoryPath: string): Promise<InstalledApp[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true }).catch(() => []);
  const apps = await Promise.all(
    entries
      .filter((entry) => entry.name.endsWith(".app"))
      .map((entry) => buildApp(path.join(directoryPath, entry.name))),
  );

  return apps.filter((app): app is InstalledApp => app !== null);
}

async function buildApp(appPath: string): Promise<InstalledApp | null> {
  const name = path.basename(appPath, ".app");
  const bundleId = await runShellCommand(`mdls -name kMDItemCFBundleIdentifier -raw ${JSON.stringify(appPath)}`);
  const running = await runShellCommand(`pgrep -x ${JSON.stringify(name)}`);

  return {
    name,
    path: toPosixPath(appPath),
    bundleId: bundleId && bundleId !== "(null)" ? bundleId : `local.${name.replace(/\s+/g, "-").toLowerCase()}`,
    isRunning: Boolean(running),
    icon: null,
    category: APP_CATEGORIES[name] ?? "other",
  };
}

function categorizeProcess(name: string): ProcessCategory {
  const normalized = name.toLowerCase();

  if (["claude", "codex", "gemini"].some((item) => normalized.includes(item))) {
    return "ai-cli";
  }

  if (["node", "python", "ruby", "go", "java"].some((item) => normalized.includes(item))) {
    return "dev-tool";
  }

  if (["chrome", "safari", "firefox", "arc"].some((item) => normalized.includes(item))) {
    return "browser";
  }

  if (["cursor", "code", "vim"].some((item) => normalized.includes(item))) {
    return "editor";
  }

  if (["kernel", "launchd", "windowserver"].some((item) => normalized.includes(item))) {
    return "system";
  }

  return normalized.endsWith(".app") ? "app" : "other";
}

function parseCpuUsage(output: string) {
  const match = output.match(/CPU usage:\s+(\d+(?:\.\d+)?)% user,\s+(\d+(?:\.\d+)?)% sys/i);
  const user = Number(match?.[1] ?? "0");
  const system = Number(match?.[2] ?? "0");
  return Number((user + system).toFixed(1));
}

function parseMemory(totalOutput: string, topOutput: string, vmStatOutput: string) {
  const totalBytes = Number(totalOutput || "0");
  const parsedFromTop = parseTopMemory(topOutput, totalBytes);

  if (parsedFromTop) {
    return parsedFromTop;
  }

  return parseVmStatMemory(totalBytes, vmStatOutput);
}

function parseTopMemory(topOutput: string, totalBytes: number) {
  const line = topOutput
    .split(/\r?\n/)
    .find((entry) => entry.includes("PhysMem:"));

  if (!line) {
    return null;
  }

  const usedLabel = line.match(/PhysMem:\s+([0-9.]+[BKMGTP])\s+used/i)?.[1] ?? null;
  const unusedLabel = line.match(/,\s+([0-9.]+[BKMGTP])\s+unused/i)?.[1] ?? null;
  const usedBytes = usedLabel ? parseHumanBytes(usedLabel) : 0;
  const unusedBytes = unusedLabel ? parseHumanBytes(unusedLabel) : 0;

  if (usedBytes <= 0 || totalBytes <= 0) {
    return null;
  }

  const freeBytes = unusedBytes > 0
    ? Math.min(unusedBytes, totalBytes)
    : Math.max(totalBytes - usedBytes, 0);

  return {
    total: formatBytes(totalBytes),
    used: formatBytes(usedBytes),
    free: formatBytes(freeBytes),
    percent: Number(((usedBytes / totalBytes) * 100).toFixed(1)),
  };
}

function parseVmStatMemory(totalBytes: number, vmStatOutput: string) {
  const pageSize = Number(vmStatOutput.match(/page size of (\d+) bytes/)?.[1] ?? "4096");
  const activePages = Number(vmStatOutput.match(/Pages active:\s+(\d+)\./)?.[1] ?? "0");
  const speculativePages = Number(vmStatOutput.match(/Pages speculative:\s+(\d+)\./)?.[1] ?? "0");
  const wiredPages = Number(vmStatOutput.match(/Pages wired down:\s+(\d+)\./)?.[1] ?? "0");
  const purgeablePages = Number(vmStatOutput.match(/Pages purgeable:\s+(\d+)\./)?.[1] ?? "0");
  const compressedPages = Number(
    vmStatOutput.match(/Pages occupied by compressor:\s+(\d+)\./)?.[1] ?? "0",
  );
  const usedPages = Math.max(
    activePages + speculativePages + wiredPages + compressedPages - purgeablePages,
    0,
  );
  const usedBytes = usedPages * pageSize;
  const freeBytes = Math.max(totalBytes - usedBytes, 0);

  return {
    total: formatBytes(totalBytes),
    used: formatBytes(usedBytes),
    free: formatBytes(freeBytes),
    percent: totalBytes ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0,
  };
}

function parseDisk(output: string) {
  const parts = output.trim().split(/\s+/);
  const totalKb = Number(parts[1] ?? "0");
  const usedKb = Number(parts[2] ?? "0");
  const freeKb = Number(parts[3] ?? "0");
  const reportedPercent = Number.parseFloat((parts[4] ?? "").replace("%", ""));
  const percent = Number.isFinite(reportedPercent)
    ? reportedPercent
    : totalKb
      ? Number(((usedKb / totalKb) * 100).toFixed(1))
      : 0;

  return {
    total: formatBytes(totalKb * 1024),
    used: formatBytes(usedKb * 1024),
    free: formatBytes(freeKb * 1024),
    percent,
  };
}

function parseHumanBytes(value: string): number {
  const match = value.trim().match(/^(\d+(?:\.\d+)?)([BKMGTP])$/i);

  if (!match) {
    return 0;
  }

  const amount = Number.parseFloat(match[1] ?? "0");
  const unit = (match[2] ?? "B").toUpperCase();
  const unitIndex = ["B", "K", "M", "G", "T", "P"].indexOf(unit);

  if (!Number.isFinite(amount) || unitIndex < 0) {
    return 0;
  }

  return amount * 1024 ** unitIndex;
}

function countProcessCategories(processes: ProcessInfo[]) {
  const initial = {
    "dev-tool": 0,
    "ai-cli": 0,
    browser: 0,
    editor: 0,
    system: 0,
    app: 0,
    other: 0,
  } satisfies Record<ProcessCategory, number>;

  return processes.reduce(
    (acc, process) => ({ ...acc, [process.category]: acc[process.category] + 1 }),
    initial,
  );
}
