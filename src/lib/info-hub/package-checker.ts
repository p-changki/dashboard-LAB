import path from "node:path";

import type { PackageUpdate, PackageUpdatesResponse } from "@/lib/types";

import { clearCache, readThroughCache } from "@/lib/parsers/cache";
import { parseProjectsLite } from "@/lib/parsers/projects-parser";
import { readUtf8 } from "@/lib/parsers/shared";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getPackageUpdates(options?: { forceRefresh?: boolean }): Promise<PackageUpdatesResponse> {
  if (options?.forceRefresh) {
    clearCache("info-hub:packages");
  }

  const items = await readThroughCache("info-hub:packages", CACHE_TTL_MS, loadPackageUpdates);
  return {
    items,
    totalCount: items.length,
    cachedAt: new Date().toISOString(),
    nextRefreshAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  };
}

async function loadPackageUpdates(): Promise<PackageUpdate[]> {
  const projects = await parseProjectsLite();
  const packageMap = new Map<string, { currentVersion: string; projects: Set<string> }>();

  for (const project of projects.projects) {
    const raw = await readUtf8(path.join(project.path, "package.json"));
    if (!raw) continue;
    const parsed = JSON.parse(raw) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const deps = { ...(parsed.dependencies ?? {}), ...(parsed.devDependencies ?? {}) };
    Object.entries(deps).forEach(([name, version]) => {
      const current = packageMap.get(name) ?? { currentVersion: normalizeVersion(version), projects: new Set<string>() };
      current.projects.add(project.name);
      current.currentVersion = normalizeVersion(version);
      packageMap.set(name, current);
    });
  }

  const updates = await Promise.all(
    [...packageMap.entries()].slice(0, 50).map(async ([name, info]) => {
      const latest = await fetch(`https://registry.npmjs.org/${name}/latest`, { cache: "no-store" })
        .then((response) => response.json() as Promise<{ version?: string }>)
        .then((payload) => payload.version || "")
        .catch(() => "");
      const updateType = getUpdateType(info.currentVersion, latest);
      return updateType
        ? {
            name,
            currentVersion: info.currentVersion,
            latestVersion: latest,
            updateType,
            projects: [...info.projects].sort(),
            npmUrl: `https://www.npmjs.com/package/${name}`,
            changelogUrl: `https://www.npmjs.com/package/${name}?activeTab=versions`,
          } satisfies PackageUpdate
        : null;
    }),
  );

  return updates.filter((item): item is PackageUpdate => item !== null);
}

function normalizeVersion(version: string) {
  return version.replace(/^[^\d]*/, "");
}

function getUpdateType(current: string, latest: string) {
  const [cMajor, cMinor] = current.split(".").map((item) => Number.parseInt(item || "0", 10));
  const [lMajor, lMinor] = latest.split(".").map((item) => Number.parseInt(item || "0", 10));
  if (lMajor > cMajor) return "major";
  if (lMajor === cMajor && lMinor > cMinor) return "minor";
  return null;
}
