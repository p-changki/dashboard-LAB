import os from "node:os";
import path from "node:path";
import { access, readdir } from "node:fs/promises";

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
  "Docker Desktop": "development",
  Postman: "development",
  iTerm: "development",
  Terminal: "development",
  "Windows Terminal": "development",
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

const WINDOWS_APP_CANDIDATES = [
  { name: "Visual Studio Code", category: "development", roots: ["LOCALAPPDATA"], relativePath: ["Programs", "Microsoft VS Code", "Code.exe"] },
  { name: "Cursor", category: "development", roots: ["LOCALAPPDATA"], relativePath: ["Programs", "Cursor", "Cursor.exe"] },
  { name: "Docker Desktop", category: "development", roots: ["ProgramFiles"], relativePath: ["Docker", "Docker", "Docker Desktop.exe"] },
  { name: "Postman", category: "development", roots: ["LOCALAPPDATA"], relativePath: ["Postman", "Postman.exe"] },
  { name: "Google Chrome", category: "browser", roots: ["ProgramFiles", "ProgramFiles(x86)"], relativePath: ["Google", "Chrome", "Application", "chrome.exe"] },
  { name: "Firefox", category: "browser", roots: ["ProgramFiles", "ProgramFiles(x86)"], relativePath: ["Mozilla Firefox", "firefox.exe"] },
  { name: "Notion", category: "productivity", roots: ["LOCALAPPDATA"], relativePath: ["Programs", "Notion", "Notion.exe"] },
  { name: "Obsidian", category: "productivity", roots: ["LOCALAPPDATA"], relativePath: ["Programs", "Obsidian", "Obsidian.exe"] },
  { name: "Slack", category: "productivity", roots: ["LOCALAPPDATA"], relativePath: ["slack", "slack.exe"] },
  { name: "Discord", category: "productivity", roots: ["LOCALAPPDATA"], relativePath: ["Discord", "Update.exe"] },
  { name: "Spotify", category: "media", roots: ["APPDATA"], relativePath: ["Spotify", "Spotify.exe"] },
] as const;

const LINUX_APP_CANDIDATES = [
  { name: "Visual Studio Code", category: "development", commands: ["code"] },
  { name: "Cursor", category: "development", commands: ["cursor"] },
  { name: "Docker Desktop", category: "development", commands: ["docker-desktop"] },
  { name: "Postman", category: "development", commands: ["postman"] },
  { name: "Google Chrome", category: "browser", commands: ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"] },
  { name: "Firefox", category: "browser", commands: ["firefox"] },
  { name: "Obsidian", category: "productivity", commands: ["obsidian"] },
  { name: "Slack", category: "productivity", commands: ["slack"] },
  { name: "Discord", category: "productivity", commands: ["discord"] },
  { name: "Spotify", category: "media", commands: ["spotify"] },
] as const;

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
  const totalBytes = os.totalmem();
  const freeBytes = os.freemem();
  const usedBytes = Math.max(totalBytes - freeBytes, 0);
  const cpuCores = os.cpus().length;

  return {
    hostname: os.hostname(),
    os: `${os.type()} ${os.release()}`,
    arch: os.arch(),
    cpu: {
      model: os.cpus()[0]?.model ?? "unknown",
      cores: cpuCores,
      usage: await loadCpuUsage(cpuCores),
    },
    memory: {
      total: formatBytes(totalBytes),
      used: formatBytes(usedBytes),
      free: formatBytes(freeBytes),
      percent: totalBytes ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0,
    },
    disk: await loadDiskInfo(),
    uptime: formatUptime(os.uptime()),
    network: { localIP: getLocalIpAddress(), publicIP: null },
  };
}

async function loadProcesses(): Promise<ProcessInfo[]> {
  if (process.platform === "win32") {
    return loadWindowsProcesses();
  }

  const output = await runShellCommand(
    "ps -axo pid=,comm=,%cpu=,rss=,%mem=,user=,start=,command= -r | head -50",
  );

  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => parseUnixProcessLine(line))
    .filter((item): item is ProcessInfo => item !== null);
}

async function loadApps() {
  if (process.platform === "darwin") {
    const appPaths = ["/Applications", "/System/Applications"];
    const apps = await Promise.all(appPaths.map((appPath) => scanMacAppDirectory(appPath)));
    return { apps: apps.flat().sort((left, right) => left.name.localeCompare(right.name)) };
  }

  if (process.platform === "win32") {
    const apps = await scanWindowsApps();
    return { apps: apps.sort((left, right) => left.name.localeCompare(right.name)) };
  }

  const apps = await scanLinuxApps();
  return { apps: apps.sort((left, right) => left.name.localeCompare(right.name)) };
}

function parseUnixProcessLine(line: string): ProcessInfo | null {
  const parts = line.trim().split(/\s+/);
  const pid = Number(parts[0]);
  const name = parts[1] ?? "unknown";
  const cpu = Number(parts[2] ?? "0");
  const memoryKb = Number(parts[3] ?? "0");
  const memoryPercent = Number(parts[4] ?? "0");
  const user = parts[5] ?? "";
  const startTime = parts[6] ?? "";
  const command = parts.slice(7).join(" ").slice(0, 160);

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

async function loadWindowsProcesses(): Promise<ProcessInfo[]> {
  const totalMemory = os.totalmem();
  const output = await runPowerShell(
    "Get-Process | Sort-Object CPU -Descending | Select-Object -First 50 Id,ProcessName,CPU,WS,Path | ConvertTo-Json -Compress",
  );

  const parsed = safeJsonParse(output);
  const items = Array.isArray(parsed) ? parsed : parsed ? [parsed] : [];

  return items
    .map((item) => {
      if (!isObject(item)) {
        return null;
      }

      const pid = Number(item.Id ?? 0);
      const name = String(item.ProcessName ?? "unknown");
      const workingSet = Number(item.WS ?? 0);
      const cpuSeconds = Number(item.CPU ?? 0);
      const memoryMb = Number((workingSet / 1024 / 1024).toFixed(1));

      if (!Number.isFinite(pid)) {
        return null;
      }

      return {
        pid,
        name,
        cpu: Number.isFinite(cpuSeconds) ? Number(cpuSeconds.toFixed(1)) : 0,
        memory: memoryMb,
        memoryPercent: totalMemory ? Number(((workingSet / totalMemory) * 100).toFixed(1)) : 0,
        user: "",
        startTime: "",
        command: String(item.Path ?? name).slice(0, 160),
        category: categorizeProcess(name),
      } satisfies ProcessInfo;
    })
    .filter((item): item is ProcessInfo => item !== null);
}

async function loadCpuUsage(cpuCores: number) {
  if (process.platform === "darwin") {
    return parseDarwinCpuUsage(await runShellCommand("top -l 1"));
  }

  if (process.platform === "linux") {
    const output = await runShellCommand("LANG=C top -bn1 | head -5");
    const line = output
      .split(/\r?\n/)
      .find((entry) => entry.includes("Cpu(s)") || entry.includes("%Cpu"));

    if (line) {
      const user = Number(line.match(/(\d+(?:\.\d+)?)\s*us/i)?.[1] ?? "0");
      const system = Number(line.match(/(\d+(?:\.\d+)?)\s*sy/i)?.[1] ?? "0");
      const combined = user + system;
      if (Number.isFinite(combined)) {
        return Number(combined.toFixed(1));
      }
    }
  }

  if (process.platform === "win32") {
    const output = await runPowerShell(
      "(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average",
    );
    const percentage = Number(output.trim());
    if (Number.isFinite(percentage)) {
      return Number(percentage.toFixed(1));
    }
  }

  if (process.platform !== "win32" && cpuCores > 0) {
    return Number(Math.min((os.loadavg()[0] / cpuCores) * 100, 100).toFixed(1));
  }

  return 0;
}

async function loadDiskInfo() {
  if (process.platform === "win32") {
    const output = await runPowerShell(
      "$disk = Get-CimInstance Win32_LogicalDisk -Filter \"DeviceID='C:'\" | Select-Object Size,FreeSpace; $disk | ConvertTo-Json -Compress",
    );
    const disk = safeJsonParse(output);

    if (isObject(disk)) {
      const totalBytes = Number(disk.Size ?? 0);
      const freeBytes = Number(disk.FreeSpace ?? 0);
      const usedBytes = Math.max(totalBytes - freeBytes, 0);
      return {
        total: formatBytes(totalBytes),
        used: formatBytes(usedBytes),
        free: formatBytes(freeBytes),
        percent: totalBytes ? Number(((usedBytes / totalBytes) * 100).toFixed(1)) : 0,
      };
    }

    return {
      total: "unknown",
      used: "unknown",
      free: "unknown",
      percent: 0,
    };
  }

  const output = await runShellCommand("df -kP / | tail -1");
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

async function scanMacAppDirectory(directoryPath: string): Promise<InstalledApp[]> {
  const entries = await readdir(directoryPath, { withFileTypes: true }).catch(() => []);
  const apps = await Promise.all(
    entries
      .filter((entry) => entry.name.endsWith(".app"))
      .map((entry) => buildMacApp(path.join(directoryPath, entry.name))),
  );

  return apps.filter((app): app is InstalledApp => app !== null);
}

async function buildMacApp(appPath: string): Promise<InstalledApp | null> {
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

async function scanWindowsApps(): Promise<InstalledApp[]> {
  const apps: InstalledApp[] = [];
  const seen = new Set<string>();

  for (const candidate of WINDOWS_APP_CANDIDATES) {
    for (const root of candidate.roots) {
      const base = process.env[root];
      if (!base) {
        continue;
      }

      const appPath = path.join(base, ...candidate.relativePath);
      if (seen.has(appPath) || !(await pathExists(appPath))) {
        continue;
      }

      seen.add(appPath);
      apps.push({
        name: candidate.name,
        path: appPath,
        bundleId: `local.${candidate.name.replace(/\s+/g, "-").toLowerCase()}`,
        isRunning: await isWindowsProcessRunning(path.basename(appPath)),
        icon: null,
        category: candidate.category,
      });
    }
  }

  return apps;
}

async function scanLinuxApps(): Promise<InstalledApp[]> {
  const apps: InstalledApp[] = [];
  const seen = new Set<string>();

  for (const candidate of LINUX_APP_CANDIDATES) {
    const commandPath = await findAvailableCommandPath(candidate.commands);
    if (!commandPath || seen.has(commandPath)) {
      continue;
    }

    seen.add(commandPath);
    const binaryName = path.basename(commandPath);
    const running = await runShellCommand(`pgrep -x ${JSON.stringify(binaryName)}`);

    apps.push({
      name: candidate.name,
      path: commandPath,
      bundleId: `local.${candidate.name.replace(/\s+/g, "-").toLowerCase()}`,
      isRunning: Boolean(running),
      icon: null,
      category: candidate.category,
    });
  }

  return apps;
}

function categorizeProcess(name: string): ProcessCategory {
  const normalized = name.toLowerCase();

  if (["claude", "codex", "gemini"].some((item) => normalized.includes(item))) {
    return "ai-cli";
  }

  if (["node", "python", "ruby", "go", "java", "powershell", "pwsh"].some((item) => normalized.includes(item))) {
    return "dev-tool";
  }

  if (["chrome", "safari", "firefox", "arc", "edge", "chromium"].some((item) => normalized.includes(item))) {
    return "browser";
  }

  if (["cursor", "code", "vim", "nvim"].some((item) => normalized.includes(item))) {
    return "editor";
  }

  if (["kernel", "launchd", "windowserver", "systemd", "explorer"].some((item) => normalized.includes(item))) {
    return "system";
  }

  return normalized.endsWith(".app") || normalized.endsWith(".exe") ? "app" : "other";
}

function formatUptime(seconds: number) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);

  const parts = [];
  if (days > 0) {
    parts.push(`${days}d`);
  }
  if (hours > 0 || days > 0) {
    parts.push(`${hours}h`);
  }
  parts.push(`${minutes}m`);
  return parts.join(" ");
}

function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();

  for (const entries of Object.values(interfaces)) {
    for (const entry of entries ?? []) {
      if (entry.family === "IPv4" && !entry.internal) {
        return entry.address;
      }
    }
  }

  return "127.0.0.1";
}

function parseDarwinCpuUsage(output: string) {
  const match = output.match(/CPU usage:\s+(\d+(?:\.\d+)?)% user,\s+(\d+(?:\.\d+)?)% sys/i);
  const user = Number(match?.[1] ?? "0");
  const system = Number(match?.[2] ?? "0");
  return Number((user + system).toFixed(1));
}

async function runPowerShell(command: string) {
  return runShellCommand(
    `powershell -NoProfile -Command "${command.replace(/"/g, '\\"')}"`,
  );
}

async function isWindowsProcessRunning(imageName: string) {
  const output = await runShellCommand(`tasklist /FI "IMAGENAME eq ${imageName}" /NH`);
  return output.toLowerCase().includes(imageName.toLowerCase());
}

async function findAvailableCommandPath(commands: readonly string[]) {
  for (const command of commands) {
    const output = await runShellCommand(`command -v ${JSON.stringify(command)}`);
    const resolved = output.split(/\r?\n/).map((item) => item.trim()).find(Boolean);
    if (resolved) {
      return resolved;
    }
  }

  return null;
}

async function pathExists(targetPath: string) {
  try {
    await access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function safeJsonParse(value: string) {
  if (!value.trim()) {
    return null;
  }

  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
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
    (acc, process) => ({
      ...acc,
      [process.category]: acc[process.category] + 1,
    }),
    initial,
  );
}
