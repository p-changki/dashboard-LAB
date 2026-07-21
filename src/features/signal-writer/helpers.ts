// Pure helpers lifted out of SignalWriterTab. These touch no React state and
// no component closure, so they are unit-testable on their own.
import type {
  SignalWriterSignal,
  SignalWriterTargetChannel,
  SignalWriterTrendBoard,
  SignalWriterTrendBoardId,
} from "@/lib/types/signal-writer";
import type {
  SignalWriterMixSummary,
  SignalWriterPerformanceForm,
  TrendBoardReviewState,
} from "@/features/signal-writer/types";

// How many auto-selected signals get appended alongside manual picks.
const AUTO_SIGNAL_APPEND_LIMIT = 5;

export function buildSignalPool(
  pickedSignals: SignalWriterSignal[],
  autoSignals: SignalWriterSignal[],
): { items: SignalWriterSignal[]; summary: SignalWriterMixSummary } {
  if (pickedSignals.length === 0) {
    return {
      items: autoSignals,
      summary: {
        manualCount: 0,
        autoCount: autoSignals.length,
      },
    };
  }

  const seen = new Set(
    pickedSignals.map((item) => normalizeSignalWriterText(item.link || item.title)),
  );
  const autoAppend = autoSignals
    .filter((item) => {
      const key = normalizeSignalWriterText(item.link || item.title);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    })
    .slice(0, AUTO_SIGNAL_APPEND_LIMIT);

  return {
    items: [...pickedSignals, ...autoAppend],
    summary: {
      manualCount: pickedSignals.length,
      autoCount: autoAppend.length,
    },
  };
}

export function buildPreparedTrendBoard(
  board: SignalWriterTrendBoard | null,
  reviewState: Record<string, TrendBoardReviewState>,
  order: string[],
) {
  if (!board) {
    return null;
  }

  const byId = new Map(board.items.map((item) => [item.id, item]));
  const resolvedOrder = order.length > 0 ? order : board.items.map((item) => item.id);
  const orderedItems = resolvedOrder
    .map((itemId) => byId.get(itemId))
    .filter((item): item is SignalWriterTrendBoard["items"][number] => Boolean(item));

  return {
    ...board,
    items: orderedItems
      .filter((item) => getTrendBoardReviewState(reviewState, item.id).included)
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        reviewNote: getTrendBoardReviewState(reviewState, item.id).note || undefined,
      })),
  };
}

export function syncTrendBoardReviewState(
  board: SignalWriterTrendBoard | null,
  current: Record<string, TrendBoardReviewState>,
) {
  if (!board) {
    return {};
  }

  return Object.fromEntries(
    board.items.map((item) => [item.id, getTrendBoardReviewState(current, item.id)]),
  );
}

export function syncTrendBoardOrder(board: SignalWriterTrendBoard | null, current: string[]) {
  if (!board) {
    return [];
  }

  const existing = current.filter((itemId) => board.items.some((item) => item.id === itemId));
  const missing = board.items.map((item) => item.id).filter((itemId) => !existing.includes(itemId));
  return [...existing, ...missing];
}

export function getTrendBoardReviewState(
  reviewState: Record<string, TrendBoardReviewState>,
  itemId: string,
): TrendBoardReviewState {
  return reviewState[itemId] ?? { included: true, reviewed: false, note: "" };
}

export function markIncludedTrendBoardItemsReviewed(
  board: SignalWriterTrendBoard | null,
  current: Record<string, TrendBoardReviewState>,
) {
  if (!board) {
    return current;
  }

  const next = { ...current };
  for (const item of board.items) {
    const review = getTrendBoardReviewState(next, item.id);
    if (review.included) {
      next[item.id] = { ...review, reviewed: true };
    }
  }

  return next;
}

export function moveTrendBoardItem(current: string[], itemId: string, direction: "up" | "down") {
  const index = current.indexOf(itemId);
  if (index === -1) {
    return current;
  }

  const nextIndex = direction === "up" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= current.length) {
    return current;
  }

  const next = [...current];
  [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
  return next;
}

export function resetTrendBoardReviewState(
  board: SignalWriterTrendBoard | null,
  current: Record<string, TrendBoardReviewState>,
) {
  if (!board) {
    return current;
  }

  const next = { ...current };
  for (const item of board.items) {
    next[item.id] = { included: true, reviewed: false, note: "" };
  }

  return next;
}

export function createDefaultPerformanceForm(): SignalWriterPerformanceForm {
  return {
    postUrl: "",
    postedAt: "",
    views: "",
    likes: "",
    replies: "",
    reposts: "",
    saves: "",
    notes: "",
  };
}

export function toMetricNumber(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return 0;
  }

  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function toPostedAtIso(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

export function getResearchCacheKey(signalId: string, channel: SignalWriterTargetChannel) {
  return `${signalId}:${channel}`;
}

export function normalizeSignalWriterText(value: string) {
  return value.trim().toLowerCase();
}

export function formatTrendBoardPresetLabel(boardId: SignalWriterTrendBoardId, locale: "ko" | "en") {
  if (locale === "en") {
    switch (boardId) {
      case "github":
        return "GitHub";
      case "npm":
        return "npm";
      case "frontend":
        return "Frontend";
      case "backend":
        return "Backend";
      case "fullstack":
        return "Fullstack";
      case "skills":
        return "Skills";
    }
  }

  switch (boardId) {
    case "github":
      return "GitHub 트렌딩";
    case "npm":
      return "npm 급상승";
    case "frontend":
      return "프런트엔드";
    case "backend":
      return "백엔드";
    case "fullstack":
      return "풀스택";
    case "skills":
      return "AI 스킬/툴";
  }
}

export function formatTimestamp(value: string, locale: "ko" | "en") {
  try {
    return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "ko-KR", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(value));
  } catch {
    return value;
  }
}
