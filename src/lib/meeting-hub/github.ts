import "server-only";

import { spawn } from "node:child_process";

import { checkCommandAvailable } from "@/lib/command-availability";
import type {
  MeetingHubActionItem,
  MeetingHubGithubBoardCard,
  MeetingHubGithubBoardColumn,
  MeetingHubGithubIssue,
  MeetingHubGithubOverviewResponse,
  MeetingHubGithubProjectBoard,
  MeetingHubGithubPullRequest,
  MeetingHubGithubRepoOverview,
} from "@/lib/types";

const GITHUB_API_BASE = "https://api.github.com";

interface GithubRestIssue {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  updated_at: string;
  user?: { login?: string | null } | null;
  assignees?: Array<{ login?: string | null }>;
  labels?: Array<{ name?: string | null } | string>;
  pull_request?: unknown;
}

interface GithubRestPull {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  updated_at: string;
  user?: { login?: string | null } | null;
  labels?: Array<{ name?: string | null } | string>;
}

interface GithubRestCreatedIssue {
  number: number;
  html_url: string;
}

interface GithubIssueStateSyncResult {
  actionId: string;
  repository: string;
  issueNumber: number;
  issueUrl: string;
  issueState: "open" | "closed";
}

interface GithubGraphqlResponse<T> {
  data?: T;
  errors?: Array<{ message?: string | null }>;
}

interface GithubProjectBoardQueryData {
  repository: {
    projectsV2: {
      nodes: Array<{
        id: string;
        number: number;
        title: string;
        url: string;
        closed: boolean;
        updatedAt: string;
        items: {
          nodes: Array<{
            id: string;
            fieldValueByName:
              | {
                  __typename: "ProjectV2ItemFieldSingleSelectValue";
                  name?: string | null;
                }
              | null;
            content:
              | {
                  __typename: "Issue";
                  number: number;
                  title: string;
                  url: string;
                  state: "OPEN" | "CLOSED";
                  updatedAt?: string | null;
                  assignees?: { nodes?: Array<{ login?: string | null } | null> | null } | null;
                  labels?: { nodes?: Array<{ name?: string | null } | null> | null } | null;
                }
              | {
                  __typename: "PullRequest";
                  number: number;
                  title: string;
                  url: string;
                  state: "OPEN" | "CLOSED" | "MERGED";
                  isDraft?: boolean | null;
                  updatedAt?: string | null;
                  labels?: { nodes?: Array<{ name?: string | null } | null> | null } | null;
                }
              | {
                  __typename: "DraftIssue";
                  title?: string | null;
                }
              | null;
          } | null>;
        };
      } | null>;
    };
  } | null;
}

const PROJECT_BOARD_QUERY = `query MeetingHubProjectBoards($owner: String!, $repo: String!) {
  repository(owner: $owner, name: $repo) {
    projectsV2(first: 5) {
      nodes {
        id
        number
        title
        url
        closed
        updatedAt
        items(first: 50) {
          nodes {
            id
            fieldValueByName(name: "Status") {
              __typename
              ... on ProjectV2ItemFieldSingleSelectValue {
                name
              }
            }
            content {
              __typename
              ... on Issue {
                number
                title
                url
                state
                updatedAt
                assignees(first: 5) {
                  nodes {
                    login
                  }
                }
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
              }
              ... on PullRequest {
                number
                title
                url
                state
                isDraft
                updatedAt
                labels(first: 10) {
                  nodes {
                    name
                  }
                }
              }
              ... on DraftIssue {
                title
              }
            }
          }
        }
      }
    }
  }
}`;

export async function getMeetingHubGithubOverview(
  repos: string[],
): Promise<MeetingHubGithubOverviewResponse> {
  const normalizedRepos = [...new Set(repos.map((repo) => repo.trim()).filter(Boolean))];
  const authSource = await resolveGithubSource();

  if (authSource === "none") {
    return {
      authenticated: false,
      source: "none",
      repos: [],
    };
  }

  const repoOverviews = await Promise.all(
    normalizedRepos.map((repo) => loadRepoOverview(repo, authSource)),
  );

  return {
    authenticated: true,
    source: authSource,
    repos: repoOverviews,
  };
}

export async function createMeetingHubGithubIssue(input: {
  repo: string;
  title: string;
  body: string;
}) {
  const authSource = await resolveGithubSource();

  if (authSource === "none") {
    throw new Error(
      "GitHub auth is unavailable. Install gh and run gh auth login, or set GITHUB_TOKEN / GH_TOKEN.",
    );
  }

  const issue = await createIssueViaSource(input, authSource);
  return {
    issueNumber: issue.number,
    issueUrl: issue.html_url,
    source: authSource,
  };
}

export async function syncMeetingHubGithubIssues(actions: MeetingHubActionItem[]) {
  const linkedActions = actions.filter(
    (item): item is MeetingHubActionItem & { repository: string; issueNumber: number } =>
      Boolean(item.repository && item.issueNumber),
  );

  if (linkedActions.length === 0) {
    return {
      source: "none" as const,
      updates: [] as GithubIssueStateSyncResult[],
    };
  }

  const authSource = await resolveGithubSource();
  if (authSource === "none") {
    throw new Error(
      "GitHub auth is unavailable. Install gh and run gh auth login, or set GITHUB_TOKEN / GH_TOKEN.",
    );
  }

  const updates = await Promise.all(
    linkedActions.map(async (item) => {
      const issue = await requestGithubJson<GithubRestIssue>(
        `repos/${item.repository}/issues/${item.issueNumber}`,
        authSource,
      );

      return {
        actionId: item.id,
        repository: item.repository,
        issueNumber: issue.number,
        issueUrl: issue.html_url,
        issueState: issue.state,
      } satisfies GithubIssueStateSyncResult;
    }),
  );

  return {
    source: authSource,
    updates,
  };
}

async function loadRepoOverview(
  repo: string,
  source: "gh" | "token",
): Promise<MeetingHubGithubRepoOverview> {
  const [issuesPayload, pullsPayload, projectBoards] = await Promise.all([
    requestGithubJson<GithubRestIssue[]>(`repos/${repo}/issues?state=open&per_page=10`, source),
    requestGithubJson<GithubRestPull[]>(`repos/${repo}/pulls?state=open&per_page=10`, source),
    loadRepoProjectBoards(repo, source),
  ]);

  const issues = issuesPayload
    .filter((item) => !item.pull_request)
    .map(mapIssue);
  const pulls = pullsPayload.map(mapPull);

  const inferredBoard = buildInferredBoard(repo, issues, pulls);

  return {
    repo,
    issues,
    pulls,
    boards: projectBoards.boards.length > 0 ? projectBoards.boards : [inferredBoard],
    boardMessage:
      projectBoards.boards.length > 0 ? null : projectBoards.message,
  };
}

async function createIssueViaSource(
  input: { repo: string; title: string; body: string },
  source: "gh" | "token",
) {
  if (source === "token") {
    return requestGithubJson<GithubRestCreatedIssue>(
      `repos/${input.repo}/issues`,
      source,
      {
        method: "POST",
        body: { title: input.title, body: input.body },
      },
    );
  }

  const stdout = await runGhJson([
    "api",
    `repos/${input.repo}/issues`,
    "--method",
    "POST",
    "-f",
    `title=${input.title}`,
    "-f",
    `body=${input.body}`,
  ]);

  return JSON.parse(stdout) as GithubRestCreatedIssue;
}

async function requestGithubJson<T>(
  endpoint: string,
  source: "gh" | "token",
  options?: { method?: "GET" | "POST"; body?: Record<string, unknown> },
) {
  if (source === "token") {
    const token = getGithubToken();
    if (!token) {
      throw new Error("GitHub token was not found.");
    }

    const response = await fetch(`${GITHUB_API_BASE}/${endpoint}`, {
      method: options?.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      cache: "no-store",
    });

    const payload = (await response.json()) as T | { message?: string };
    if (!response.ok) {
      const errorPayload = payload as { message?: string };
      throw new Error(
        errorPayload.message || "GitHub request failed.",
      );
    }

    return payload as T;
  }

  const args = ["api", endpoint];

  if (options?.method === "POST") {
    args.push("--method", "POST");
    for (const [key, value] of Object.entries(options.body ?? {})) {
      args.push("-f", `${key}=${String(value ?? "")}`);
    }
  }

  const stdout = await runGhJson(args);
  return JSON.parse(stdout) as T;
}

async function requestGithubGraphql<T>(
  query: string,
  variables: Record<string, string>,
  source: "gh" | "token",
) {
  if (source === "token") {
    const token = getGithubToken();
    if (!token) {
      throw new Error("GitHub token was not found.");
    }

    const response = await fetch(`${GITHUB_API_BASE}/graphql`, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    });

    const payload = (await response.json()) as GithubGraphqlResponse<T> | { message?: string };
    if (!response.ok) {
      const errorPayload = payload as { message?: string };
      throw new Error(errorPayload.message || "GitHub GraphQL request failed.");
    }

    const graphqlPayload = payload as GithubGraphqlResponse<T>;
    if (graphqlPayload.errors?.length) {
      throw new Error(
        graphqlPayload.errors
          .map((error) => error.message?.trim())
          .filter(Boolean)
          .join(" | ") || "GitHub GraphQL request failed.",
      );
    }

    if (!graphqlPayload.data) {
      throw new Error("GitHub GraphQL response did not include data.");
    }

    return graphqlPayload.data;
  }

  const args = ["api", "graphql", "-f", `query=${query}`];
  for (const [key, value] of Object.entries(variables)) {
    args.push("-f", `${key}=${value}`);
  }

  const stdout = await runGhJson(args);
  const payload = JSON.parse(stdout) as GithubGraphqlResponse<T>;
  if (payload.errors?.length) {
    throw new Error(
      payload.errors
        .map((error) => error.message?.trim())
        .filter(Boolean)
        .join(" | ") || "GitHub GraphQL request failed.",
    );
  }

  if (!payload.data) {
    throw new Error("GitHub GraphQL response did not include data.");
  }

  return payload.data;
}

async function resolveGithubSource(): Promise<"gh" | "token" | "none"> {
  if (getGithubToken()) {
    return "token";
  }

  if (!(await checkCommandAvailable("gh"))) {
    return "none";
  }

  const authed = await canUseGhAuth();
  return authed ? "gh" : "none";
}

function getGithubToken() {
  return process.env.GITHUB_TOKEN?.trim() || process.env.GH_TOKEN?.trim() || "";
}

async function canUseGhAuth() {
  try {
    await runGhJson(["auth", "status"]);
    return true;
  } catch {
    return false;
  }
}

function runGhJson(args: string[]) {
  return new Promise<string>((resolve, reject) => {
    const proc = spawn("gh", args, {
      cwd: process.env.HOME || "/",
      env: { ...process.env, TERM: "dumb" },
    });

    let stdout = "";
    let stderr = "";

    proc.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim() || stderr.trim());
        return;
      }

      reject(new Error(stderr.trim() || `gh exited with code ${code ?? "unknown"}`));
    });

    proc.on("error", (error) => reject(error));
  });
}

function mapIssue(issue: GithubRestIssue): MeetingHubGithubIssue {
  return {
    id: issue.id,
    number: issue.number,
    title: issue.title,
    state: issue.state,
    url: issue.html_url,
    author: issue.user?.login ?? null,
    assignees: (issue.assignees ?? [])
      .map((assignee) => assignee.login ?? "")
      .filter(Boolean),
    labels: normalizeLabels(issue.labels),
    updatedAt: issue.updated_at,
  };
}

function mapPull(pull: GithubRestPull): MeetingHubGithubPullRequest {
  return {
    id: pull.id,
    number: pull.number,
    title: pull.title,
    state: pull.state,
    url: pull.html_url,
    author: pull.user?.login ?? null,
    labels: normalizeLabels(pull.labels),
    updatedAt: pull.updated_at,
  };
}

function normalizeLabels(labels: GithubRestIssue["labels"] | GithubRestPull["labels"]) {
  return (labels ?? [])
    .map((label) => (typeof label === "string" ? label : label?.name ?? ""))
    .filter(Boolean);
}

async function loadRepoProjectBoards(
  repo: string,
  source: "gh" | "token",
): Promise<{
  boards: MeetingHubGithubProjectBoard[];
  message: "project_access_unavailable" | "no_projects_found" | null;
}> {
  const [owner, name] = splitRepository(repo);
  if (!owner || !name) {
    return { boards: [], message: "no_projects_found" };
  }

  try {
    const payload = await requestGithubGraphql<GithubProjectBoardQueryData>(
      PROJECT_BOARD_QUERY,
      { owner, repo: name },
      source,
    );
    const boards = (payload.repository?.projectsV2.nodes ?? [])
      .filter((board): board is NonNullable<typeof board> => Boolean(board))
      .map(mapProjectBoard)
      .filter((board) => board.columns.some((column) => column.cards.length > 0));

    return {
      boards,
      message: boards.length === 0 ? "no_projects_found" : null,
    };
  } catch {
    return {
      boards: [],
      message: "project_access_unavailable",
    };
  }
}

function mapProjectBoard(
  board: NonNullable<GithubProjectBoardQueryData["repository"]>["projectsV2"]["nodes"][number],
): MeetingHubGithubProjectBoard {
  const cards = (board?.items.nodes ?? [])
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => mapProjectCard(item, board))
    .filter((item): item is MeetingHubGithubBoardCard => Boolean(item));

  const grouped = new Map<string, MeetingHubGithubBoardColumn>();
  for (const card of cards) {
    const columnKey = normalizeBoardColumnKey(card.status);
    const existing = grouped.get(columnKey);
    if (existing) {
      existing.cards.push(card);
      continue;
    }

    grouped.set(columnKey, {
      id: columnKey,
      title: card.status,
      cards: [card],
    });
  }

  return {
    id: board?.id ?? crypto.randomUUID(),
    number: board?.number ?? null,
    title: board?.title ?? "GitHub Project",
    url: board?.url ?? null,
    updatedAt: board?.updatedAt ?? null,
    closed: Boolean(board?.closed),
    source: "project",
    columns: sortBoardColumns([...grouped.values()]),
  };
}

function mapProjectCard(
  item: NonNullable<
    NonNullable<
      NonNullable<GithubProjectBoardQueryData["repository"]>["projectsV2"]["nodes"][number]
    >["items"]["nodes"][number]
  >,
  board: NonNullable<GithubProjectBoardQueryData["repository"]>["projectsV2"]["nodes"][number],
): MeetingHubGithubBoardCard | null {
  const status = item.fieldValueByName?.name?.trim() || "Unassigned";
  const content = item.content;

  if (!content) {
    return null;
  }

  if (content.__typename === "Issue") {
    return {
      id: item.id,
      title: content.title,
      url: content.url,
      kind: "issue",
      number: content.number,
      state: content.state === "OPEN" ? "open" : "closed",
      status,
      labels: normalizeNodeLabels(content.labels?.nodes),
      assignees: normalizeNodeLogins(content.assignees?.nodes),
      updatedAt: content.updatedAt ?? board?.updatedAt ?? null,
    };
  }

  if (content.__typename === "PullRequest") {
    return {
      id: item.id,
      title: content.title,
      url: content.url,
      kind: "pull",
      number: content.number,
      state: content.isDraft ? "draft" : content.state === "OPEN" ? "open" : "closed",
      status,
      labels: normalizeNodeLabels(content.labels?.nodes),
      assignees: [],
      updatedAt: content.updatedAt ?? board?.updatedAt ?? null,
    };
  }

  if (content.__typename === "DraftIssue") {
    return {
      id: item.id,
      title: content.title?.trim() || "Draft issue",
      url: board?.url ?? null,
      kind: "draft",
      number: null,
      state: "draft",
      status,
      labels: [],
      assignees: [],
      updatedAt: board?.updatedAt ?? null,
    };
  }

  return null;
}

function buildInferredBoard(
  repo: string,
  issues: MeetingHubGithubIssue[],
  pulls: MeetingHubGithubPullRequest[],
): MeetingHubGithubProjectBoard {
  const columns: MeetingHubGithubBoardColumn[] = [
    { id: "inbox", title: "Inbox", cards: [] },
    { id: "planned", title: "Planned", cards: [] },
    { id: "in-progress", title: "In Progress", cards: [] },
    { id: "review", title: "Review", cards: [] },
  ];

  const pushCard = (columnId: string, card: MeetingHubGithubBoardCard) => {
    const column = columns.find((item) => item.id === columnId);
    if (column) {
      column.cards.push(card);
    }
  };

  for (const issue of issues) {
    const status = inferIssueStatus(issue.labels);
    pushCard(status, {
      id: `issue-${issue.id}`,
      title: issue.title,
      url: issue.url,
      kind: "issue",
      number: issue.number,
      state: issue.state,
      status: formatInferredStatus(status),
      labels: issue.labels,
      assignees: issue.assignees,
      updatedAt: issue.updatedAt,
    });
  }

  for (const pull of pulls) {
    pushCard("review", {
      id: `pull-${pull.id}`,
      title: pull.title,
      url: pull.url,
      kind: "pull",
      number: pull.number,
      state: pull.state,
      status: "Review",
      labels: pull.labels,
      assignees: [],
      updatedAt: pull.updatedAt,
    });
  }

  return {
    id: `inferred-${repo}`,
    number: null,
    title: `${repo} Execution Board`,
    url: `https://github.com/${repo}`,
    updatedAt: new Date().toISOString(),
    closed: false,
    source: "inferred",
    columns,
  };
}

function inferIssueStatus(labels: string[]) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  if (normalizedLabels.some((label) => /(in[- ]?progress|doing|wip|active)/.test(label))) {
    return "in-progress";
  }

  if (normalizedLabels.some((label) => /(todo|backlog|planned|next|ready)/.test(label))) {
    return "planned";
  }

  return "inbox";
}

function formatInferredStatus(status: string) {
  switch (status) {
    case "planned":
      return "Planned";
    case "in-progress":
      return "In Progress";
    case "review":
      return "Review";
    default:
      return "Inbox";
  }
}

function splitRepository(repo: string) {
  const [owner, name] = repo.split("/", 2).map((item) => item.trim());
  return [owner ?? "", name ?? ""] as const;
}

function normalizeNodeLabels(
  labels:
    | Array<{ name?: string | null } | null>
    | null
    | undefined,
) {
  return (labels ?? [])
    .map((label) => label?.name?.trim() ?? "")
    .filter(Boolean);
}

function normalizeNodeLogins(
  logins:
    | Array<{ login?: string | null } | null>
    | null
    | undefined,
) {
  return (logins ?? [])
    .map((item) => item?.login?.trim() ?? "")
    .filter(Boolean);
}

function normalizeBoardColumnKey(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unassigned";
}

function sortBoardColumns(columns: MeetingHubGithubBoardColumn[]) {
  const order = new Map<string, number>([
    ["backlog", 1],
    ["todo", 2],
    ["planned", 3],
    ["ready", 4],
    ["in-progress", 5],
    ["review", 6],
    ["done", 7],
  ]);

  return [...columns].sort((left, right) => {
    const leftRank = order.get(left.id) ?? 100;
    const rightRank = order.get(right.id) ?? 100;
    if (leftRank !== rightRank) {
      return leftRank - rightRank;
    }

    return left.title.localeCompare(right.title);
  });
}
