// Pure mapping from GitHub REST/GraphQL payloads to Meeting Hub view models.
// No network access — callers fetch and pass the payloads in.
import type {
  MeetingHubGithubBoardCard,
  MeetingHubGithubBoardColumn,
  MeetingHubGithubIssue,
  MeetingHubGithubProjectBoard,
  MeetingHubGithubPullRequest,
} from "@/lib/types";

export interface GithubRestIssue {
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

export interface GithubRestPull {
  id: number;
  number: number;
  title: string;
  state: "open" | "closed";
  html_url: string;
  updated_at: string;
  user?: { login?: string | null } | null;
  labels?: Array<{ name?: string | null } | string>;
}

export interface GithubProjectBoardQueryData {
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


export function mapIssue(issue: GithubRestIssue): MeetingHubGithubIssue {
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

export function mapPull(pull: GithubRestPull): MeetingHubGithubPullRequest {
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

export function normalizeLabels(labels: GithubRestIssue["labels"] | GithubRestPull["labels"]) {
  return (labels ?? [])
    .map((label) => (typeof label === "string" ? label : label?.name ?? ""))
    .filter(Boolean);
}


export function mapProjectBoard(
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

export function mapProjectCard(
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

export function buildInferredBoard(
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

export function inferIssueStatus(labels: string[]) {
  const normalizedLabels = labels.map((label) => label.toLowerCase());

  if (normalizedLabels.some((label) => /(in[- ]?progress|doing|wip|active)/.test(label))) {
    return "in-progress";
  }

  if (normalizedLabels.some((label) => /(todo|backlog|planned|next|ready)/.test(label))) {
    return "planned";
  }

  return "inbox";
}

export function formatInferredStatus(status: string) {
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

export function splitRepository(repo: string) {
  const [owner, name] = repo.split("/", 2).map((item) => item.trim());
  return [owner ?? "", name ?? ""] as const;
}

export function normalizeNodeLabels(
  labels:
    | Array<{ name?: string | null } | null>
    | null
    | undefined,
) {
  return (labels ?? [])
    .map((label) => label?.name?.trim() ?? "")
    .filter(Boolean);
}

export function normalizeNodeLogins(
  logins:
    | Array<{ login?: string | null } | null>
    | null
    | undefined,
) {
  return (logins ?? [])
    .map((item) => item?.login?.trim() ?? "")
    .filter(Boolean);
}

export function normalizeBoardColumnKey(title: string) {
  return title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "unassigned";
}

export function sortBoardColumns(columns: MeetingHubGithubBoardColumn[]) {
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
