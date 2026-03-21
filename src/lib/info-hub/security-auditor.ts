import type { AuditResult, SecurityAuditResponse } from "@/lib/types";

import { clearCache, readThroughCache } from "@/lib/parsers/cache";
import { parseProjectsLite } from "@/lib/parsers/projects-parser";
import { runShellCommand } from "@/lib/parsers/shared";

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export async function getSecurityAudit(options?: { forceRefresh?: boolean }): Promise<SecurityAuditResponse> {
  if (options?.forceRefresh) {
    clearCache("info-hub:security");
  }

  const items = await readThroughCache("info-hub:security", CACHE_TTL_MS, loadSecurityAudit);
  return {
    items,
    totalCount: items.length,
    cachedAt: new Date().toISOString(),
    nextRefreshAt: new Date(Date.now() + CACHE_TTL_MS).toISOString(),
  };
}

async function loadSecurityAudit(): Promise<AuditResult[]> {
  const projects = await parseProjectsLite();
  const audits = await Promise.all(projects.projects.slice(0, 20).map(async (project) => {
    const raw = await runShellCommand("npm audit --json", project.path).catch(() => "");
    if (!raw) return null;
    return parseAudit(project.name, raw);
  }));
  return audits.filter((item): item is AuditResult => item !== null);
}

function parseAudit(project: string, raw: string): AuditResult | null {
  try {
    const payload = JSON.parse(raw) as {
      metadata?: { vulnerabilities?: Record<string, number> };
      vulnerabilities?: Record<string, { severity?: AuditResult["topIssues"][number]["severity"]; title?: string; fixAvailable?: boolean | { name?: string } }>;
    };
    const vulns = payload.metadata?.vulnerabilities;
    if (!vulns) return null;
    const topIssues = Object.entries(payload.vulnerabilities ?? {}).slice(0, 5).map(([pkg, issue]) => ({
      package: pkg,
      severity: issue.severity ?? "low",
      title: issue.title || pkg,
      fixAvailable: Boolean(issue.fixAvailable),
    }));
    return {
      project,
      vulnerabilities: {
        critical: vulns.critical ?? 0,
        high: vulns.high ?? 0,
        moderate: vulns.moderate ?? 0,
        low: vulns.low ?? 0,
        total: vulns.total ?? 0,
      },
      topIssues,
      lastChecked: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}
