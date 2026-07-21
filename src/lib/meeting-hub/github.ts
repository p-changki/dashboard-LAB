import "server-only";

import { spawn } from "node:child_process";

import { checkCommandAvailable, getCommandEnvironment } from "@/lib/command-availability";
import type {
  MeetingHubActionItem,
  MeetingHubGithubOverviewResponse,
  MeetingHubGithubProjectBoard,
  MeetingHubGithubRepoOverview,
} from "@/lib/types";
import {
  buildInferredBoard,
  mapIssue,
  mapProjectBoard,
  mapPull,
  splitRepository,
  type GithubProjectBoardQueryData,
  type GithubRestIssue,
  type GithubRestPull,
} from "@/lib/meeting-hub/github/mappers";

const GITHUB_API_BASE = "https://api.github.com";



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
      env: getCommandEnvironment({ TERM: "dumb" }),
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

