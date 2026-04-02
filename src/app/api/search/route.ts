import { getErrorMessage, jsonError } from "@/lib/api/error-response";
import { searchQuerySchema } from "@/lib/api/schemas";
import { getZodErrorMessage, isZodError, parseSearchParams } from "@/lib/api/validation";
import { getOverviewData } from "@/lib/dashboard-data";
import { readThroughCache } from "@/lib/parsers/cache";
import { collectDocs } from "@/lib/parsers/doc-hub-parser";
import { parseProjectsLite } from "@/lib/parsers/projects-parser";
import { getInstalledApps } from "@/lib/parsers/system-parser";
import type {
  GlobalSearchResponse,
  GlobalSearchResult,
  SearchResultType,
} from "@/lib/types";

const CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_RESULTS = 20;
type SearchCandidate = GlobalSearchResult & { score: number };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { q: query } = parseSearchParams(request, searchQuerySchema);

    if (!query) {
      return Response.json({ query, results: [], totalCount: 0 } satisfies GlobalSearchResponse);
    }

    const normalized = query.toLowerCase();
    const [overview, projects, docs, apps] = await Promise.all([
      readThroughCache("search-overview", CACHE_TTL_MS, getOverviewData),
      readThroughCache("search-projects", CACHE_TTL_MS, parseProjectsLite),
      readThroughCache("search-doc-hub", CACHE_TTL_MS, collectDocs),
      getInstalledApps(),
    ]);

    const candidates = [
      ...overview.skills.map((item) =>
        buildResult("skill", item.filePath, item.name, item.description, "home", `/${item.name}`, normalized, [
          ["name", item.name],
          ["description", item.description],
        ]),
      ),
      ...overview.agents.map((item) =>
        buildResult("agent", item.filePath, item.name, item.description, "home", item.name, normalized, [
          ["name", item.name],
          ["description", item.description],
        ]),
      ),
      ...overview.teams.map((item) =>
        buildResult("team", item.filePath, item.name, item.purpose, "home", item.name, normalized, [
          ["name", item.name],
          ["purpose", item.purpose],
        ]),
      ),
      ...overview.commands.map((item) =>
        buildResult("command", item.filePath, item.name, item.description, "home", item.command, normalized, [
          ["name", item.name],
          ["description", item.description],
        ]),
      ),
      ...overview.mcpServers.map((item) =>
        buildResult("mcp", item.filePath, item.name, item.transport, "home", item.name, normalized, [
          ["name", item.name],
          ["transport", item.transport],
        ]),
      ),
      ...projects.projects.map((item) =>
        buildResult("project", item.path, item.name, item.techStack.join(", "), "projects", item.path, normalized, [
          ["name", item.name],
          ["techStack", item.techStack.join(" ")],
        ]),
      ),
      ...docs.docs.map((item) =>
        buildResult("ai-doc", `${item.projectName}:${item.filePath}`, item.fileName, item.projectName, "dochub", item.filePath, normalized, [
          ["fileName", item.fileName],
          ["project", item.projectName],
          ["preview", item.preview],
        ], { project: item.projectName, file: item.filePath }),
      ),
      ...apps.apps.map((item) =>
        buildResult("app", item.path, item.name, item.category, "system", item.path, normalized, [
          ["name", item.name],
          ["category", item.category],
        ], { appPath: item.path }),
      ),
    ].filter((item): item is SearchCandidate => item !== null);

    const totalCount = candidates.length;
    const results = candidates
      .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
      .slice(0, MAX_RESULTS)
      .map(stripScore);

    return Response.json({ query, results, totalCount } satisfies GlobalSearchResponse);
  } catch (error) {
    if (isZodError(error)) {
      return jsonError("INVALID_QUERY", getZodErrorMessage(error, "검색 쿼리 형식이 올바르지 않습니다."), 400);
    }

    return jsonError("SEARCH_FAILED", getErrorMessage(error, "검색을 처리하지 못했습니다."), 500);
  }
}

function buildResult(
  type: SearchResultType,
  id: string,
  title: string,
  subtitle: string,
  tab: string,
  action: string,
  query: string,
  matchFields: Array<[string, string]>,
  payload?: Record<string, string>,
): SearchCandidate | null {
  const match = getSearchMatch(matchFields, query);

  if (!match) {
    return null;
  }

  return {
    id,
    type,
    title,
    subtitle,
    icon: type,
    tab,
    action,
    actionMode: type === "skill" || type === "command" ? "copy" : type === "app" ? "launch" : "navigate",
    matchField: match.field,
    payload,
    score: match.score,
  };
}

function getSearchMatch(
  fields: Array<[string, string]>,
  query: string,
): { field: string; score: number } | null {
  let best: { field: string; score: number } | null = null;

  fields.forEach(([field, raw]) => {
    const target = raw.toLowerCase();
    const score = getSearchScore(target, query);

    if (!score || (best && best.score >= score)) {
      return;
    }

    best = { field, score };
  });

  return best;
}

function getSearchScore(target: string, query: string) {
  if (target === query) return 300;
  if (target.startsWith(query)) return 200;
  if (target.includes(query)) return 100;
  return 0;
}

function stripScore(item: SearchCandidate): GlobalSearchResult {
  const { score, ...rest } = item;
  void score;
  return rest;
}
