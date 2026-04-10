import "server-only";

import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";

import {
  containsCliTranscriptLeakInStrings,
  isRecord,
  parseLastJsonObject,
} from "@/lib/ai/structured-output";
import { generateOpenAiText, hasOpenAiApiFallback } from "@/lib/ai/openai-responses";
import { runSpawnTask } from "@/lib/ai-skills/runner";
import {
  checkCommandAvailable,
  getCommandEnvironment,
} from "@/lib/command-availability";
import type { AppLocale } from "@/lib/locale";
import {
  buildSignalWriterCodexArgs,
  createSignalWriterCodexInvalidOutputError,
  isSignalWriterCodexOutputError,
  throwIfSignalWriterCodexOutputCorrupted,
  unwrapSignalWriterCodexResult,
} from "@/lib/signal-writer/codex";
import type {
  SignalWriterAiRunner,
  SignalWriterTargetChannel,
  SignalWriterTrendBoard,
  SignalWriterTrendBoardDraft,
} from "@/lib/types";

type TrendBoardDraftPayload = {
  title: string;
  boardSummary: string;
  hook: string;
  shortPost: string;
  threadPosts: string[];
  firstComment: string;
  followUpReplies: string[];
  hashtags: string[];
  whyNow: string;
  postingTips: string[];
};

const SIGNAL_WRITER_TIMEOUT_MS = 90_000;

export async function generateSignalWriterTrendBoardDraft(
  board: SignalWriterTrendBoard,
  locale: AppLocale,
  requestedRunner: SignalWriterAiRunner = "auto",
  channel: SignalWriterTargetChannel = "threads",
): Promise<SignalWriterTrendBoardDraft> {
  const generatedAt = new Date().toISOString();
  const resolvedRunner = await resolveTrendBoardRunner(requestedRunner);
  const prompt = buildTrendBoardPrompt(board, locale, channel);

  if (resolvedRunner !== "template") {
    try {
      const raw = await runTrendBoardModel(resolvedRunner, prompt, locale);
      if (resolvedRunner === "codex") {
        throwIfSignalWriterCodexOutputCorrupted(raw, locale, "trend-board");
      }
      const parsed = parseTrendBoardPayload(raw);

      if (parsed) {
        return normalizeTrendBoardDraft(board, locale, channel, generatedAt, resolvedRunner, parsed);
      }

      if (resolvedRunner === "codex") {
        throw createSignalWriterCodexInvalidOutputError(locale, "trend-board");
      }
    } catch (error) {
      if (isSignalWriterCodexOutputError(error)) {
        throw error;
      }

      if (requestedRunner !== "auto") {
        throw error;
      }
    }
  }

  return normalizeTrendBoardDraft(
    board,
    locale,
    channel,
    generatedAt,
    "template",
    buildTemplateTrendBoardDraft(board, locale, channel),
  );
}

async function resolveTrendBoardRunner(
  requestedRunner: SignalWriterAiRunner,
): Promise<Exclude<SignalWriterAiRunner, "auto">> {
  if (requestedRunner === "template") {
    return "template";
  }

  if (requestedRunner === "openai") {
    if (!hasOpenAiApiFallback()) {
      throw new Error("OpenAI API key is not configured.");
    }
    return "openai";
  }

  if (requestedRunner === "claude") {
    if (await checkCommandAvailable("claude")) {
      return "claude";
    }
    throw new Error("Claude CLI is not available.");
  }

  if (requestedRunner === "codex") {
    if (await checkCommandAvailable("codex")) {
      return "codex";
    }
    throw new Error("Codex CLI is not available.");
  }

  if (requestedRunner === "gemini") {
    if (await checkCommandAvailable("gemini")) {
      return "gemini";
    }
    throw new Error("Gemini CLI is not available.");
  }

  if (await checkCommandAvailable("claude")) {
    return "claude";
  }

  if (await checkCommandAvailable("codex")) {
    return "codex";
  }

  if (await checkCommandAvailable("gemini")) {
    return "gemini";
  }

  if (hasOpenAiApiFallback()) {
    return "openai";
  }

  return "template";
}

async function runTrendBoardModel(
  runner: Exclude<SignalWriterAiRunner, "auto" | "template">,
  prompt: string,
  locale: AppLocale,
) {
  if (runner === "openai") {
    return generateOpenAiText(prompt, { model: "gpt-5-mini", reasoningEffort: "low" });
  }

  if (runner === "claude") {
    return runClaude(prompt);
  }

  if (runner === "codex") {
    const outputPath = `/tmp/dashboard-lab-trend-board-${randomUUID()}.txt`;
    const result = await runSpawnTask({
      command: "codex",
      args: buildSignalWriterCodexArgs(prompt, outputPath, "trend-board"),
      cwd: process.env.HOME || "/",
      outputPath,
      timeoutMs: SIGNAL_WRITER_TIMEOUT_MS,
    });
    return unwrapSignalWriterCodexResult(
      result,
      locale,
      "trend-board",
      "Trend Board AI response is empty.",
    );
  }

  const result = await runSpawnTask({
    command: "gemini",
    args: ["-p", prompt],
    cwd: process.env.HOME || "/",
    timeoutMs: SIGNAL_WRITER_TIMEOUT_MS,
  });
  return unwrapOutput(result.output, result.error);
}

function runClaude(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(
      "claude",
      ["-p", "--output-format", "text", "--effort", "low"],
      { cwd: process.env.HOME || "/", env: getCommandEnvironment({ TERM: "dumb" }) },
    );

    let output = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill("SIGTERM");
      reject(new Error("Trend Board AI processing timed out."));
    }, SIGNAL_WRITER_TIMEOUT_MS);

    proc.stdout.on("data", (chunk: Buffer) => {
      output += chunk.toString("utf8");
    });

    proc.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(output.trim());
        return;
      }

      reject(new Error(stderr.trim() || `Claude exited with code ${code ?? "unknown"}`));
    });

    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });

    proc.stdin.write(prompt);
    proc.stdin.end();
  });
}

function unwrapOutput(output: string | null, error: string | null) {
  if (error) {
    throw new Error(error);
  }

  if (!output) {
    throw new Error("Trend Board AI response is empty.");
  }

  return output;
}

function buildTrendBoardPrompt(
  board: SignalWriterTrendBoard,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
) {
  const channelLabel = getChannelLabel(locale, channel);
  const itemsText = board.items
    .map((item) => {
      const sourceContext = item.sourceContext
        ? [
            `sourceContext=${item.sourceContext.label}`,
            `sourceSummary=${item.sourceContext.summary}`,
            `sourceDetails=${item.sourceContext.details.join(" | ") || "-"}`,
          ].join("\n")
        : "";

      return [
        `#${item.rank}`,
        `title=${item.title}`,
        `summary=${item.summary}`,
        `source=${item.sourceName}`,
        `category=${item.categoryLabel}`,
        `published=${item.publishedAt}`,
        `link=${item.link}`,
        `score=${item.score}`,
        `facts=${item.facts.join(" | ") || "-"}`,
        item.reviewNote ? `editorNote=${item.reviewNote}` : "",
        sourceContext,
      ]
        .filter(Boolean)
        .join("\n");
    })
    .join("\n\n");

  const responseShape =
    '{"title":"string","boardSummary":"string","hook":"string","shortPost":"string","threadPosts":["string"],"firstComment":"string","followUpReplies":["string"],"hashtags":["string"],"whyNow":"string","postingTips":["string"]}';

  if (locale === "en") {
    return [
      `You write ${channelLabel} ranking posts for a solo builder account.`,
      "Use only the evidence below. Do not invent features, company claims, metrics, or product positioning that are not explicitly listed.",
      "If evidence is weak, write more cautiously instead of filling gaps.",
      "Return strict JSON only.",
      `JSON shape: ${responseShape}`,
      "Rules:",
      "- Preserve the ranking order as given.",
      "- threadPosts should cover each ranked item once, with the rank number included.",
      "- Keep each ranked line factual and concise.",
      "- shortPost should introduce why this board matters today and what pattern connects the ranking.",
      "- firstComment should be a source-note style comment that can sit under the post.",
      "- followUpReplies must contain exactly 2 short replies: one question, one practical follow-up.",
      "- hashtags should be 2 to 4 specific tags.",
      "- postingTips should be 2 or 3 short practical tips.",
      "",
      `Board label: ${board.label}`,
      `Board description: ${board.description}`,
      `Target channel: ${channelLabel}`,
      `Item count: ${board.items.length}`,
      "",
      itemsText,
    ].join("\n");
  }

  return [
    `당신은 빌더 계정의 ${channelLabel}용 랭킹형 포스트를 작성합니다.`,
    "반드시 아래 근거만 사용하세요. 여기에 없는 기능, 회사 주장, 수치, 포지셔닝은 지어내지 마세요.",
    "근거가 약하면 빈칸을 메우지 말고 더 조심스럽게 쓰세요.",
    "반드시 JSON만 반환하세요.",
    `JSON 형태: ${responseShape}`,
    "규칙:",
    "- 주어진 순위를 그대로 유지하세요.",
    "- threadPosts는 각 항목을 정확히 한 번씩 다루고, 순위 번호를 포함하세요.",
    "- 각 줄은 과장보다 팩트 중심으로 짧고 선명하게 쓰세요.",
    "- shortPost는 오늘 이 보드가 왜 중요한지와 공통 흐름을 먼저 설명해야 합니다.",
    "- firstComment는 원문 링크/출처를 덧붙일 때 쓰는 소스 노트형 댓글이어야 합니다.",
    "- followUpReplies는 정확히 2개 작성하세요. 하나는 질문형, 하나는 실무형 후속 답글입니다.",
    "- hashtags는 2~4개의 구체적인 태그만 쓰세요.",
    "- postingTips는 짧고 실전적인 팁 2~3개로 쓰세요.",
    "",
    `보드 이름: ${board.label}`,
    `보드 설명: ${board.description}`,
    `게시 채널: ${channelLabel}`,
    `항목 수: ${board.items.length}`,
    "",
    itemsText,
  ].join("\n");
}

function parseTrendBoardPayload(raw: string): TrendBoardDraftPayload | null {
  const parsed = parseLastJsonObject(raw, (value): value is Partial<TrendBoardDraftPayload> => {
    if (!isRecord(value)) {
      return false;
    }

    return (
      typeof value.title === "string"
      && typeof value.boardSummary === "string"
      && typeof value.hook === "string"
      && typeof value.shortPost === "string"
      && Array.isArray(value.threadPosts)
    );
  });

  if (!parsed) {
    return null;
  }

  const title = typeof parsed.title === "string" ? parsed.title : "";
  const boardSummary = typeof parsed.boardSummary === "string" ? parsed.boardSummary : "";
  const hook = typeof parsed.hook === "string" ? parsed.hook : "";
  const shortPost = typeof parsed.shortPost === "string" ? parsed.shortPost : "";
  const threadPosts = normalizeStringArray(parsed.threadPosts);
  const firstComment = typeof parsed.firstComment === "string" ? parsed.firstComment : "";
  const followUpReplies = normalizeStringArray(parsed.followUpReplies);
  const hashtags = normalizeTags(parsed.hashtags);
  const whyNow = typeof parsed.whyNow === "string" ? parsed.whyNow : "";
  const postingTips = normalizeStringArray(parsed.postingTips);

  if (
    containsCliTranscriptLeakInStrings([
      title,
      boardSummary,
      hook,
      shortPost,
      firstComment,
      whyNow,
      ...threadPosts,
      ...followUpReplies,
      ...hashtags,
      ...postingTips,
    ])
  ) {
    return null;
  }

  return {
    title,
    boardSummary,
    hook,
    shortPost,
    threadPosts,
    firstComment,
    followUpReplies,
    hashtags,
    whyNow,
    postingTips,
  };
}

function normalizeTrendBoardDraft(
  board: SignalWriterTrendBoard,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
  generatedAt: string,
  sourceModel: Exclude<SignalWriterAiRunner, "auto">,
  payload: TrendBoardDraftPayload,
): SignalWriterTrendBoardDraft {
  const fallback = buildTemplateTrendBoardDraft(board, locale, channel);

  return {
    id: randomUUID(),
    boardId: board.id,
    title: payload.title.trim() || fallback.title,
    boardSummary: payload.boardSummary.trim() || fallback.boardSummary,
    hook: payload.hook.trim() || fallback.hook,
    shortPost: payload.shortPost.trim() || fallback.shortPost,
    threadPosts: payload.threadPosts.length > 0 ? payload.threadPosts : fallback.threadPosts,
    firstComment: payload.firstComment.trim() || fallback.firstComment,
    followUpReplies:
      payload.followUpReplies.length > 0 ? payload.followUpReplies.slice(0, 2) : fallback.followUpReplies,
    hashtags: payload.hashtags.length > 0 ? payload.hashtags : fallback.hashtags,
    whyNow: payload.whyNow.trim() || fallback.whyNow,
    postingTips: payload.postingTips.length > 0 ? payload.postingTips.slice(0, 3) : fallback.postingTips,
    generatedAt,
    channel,
    sourceModel,
  };
}

function buildTemplateTrendBoardDraft(
  board: SignalWriterTrendBoard,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
): TrendBoardDraftPayload {
  const label = board.label;
  const topItems = board.items.slice(0, 3);
  const boardSummary =
    locale === "en"
      ? `${label} is clustering around ${topItems.map((item) => item.title).join(", ")}, which suggests the same workflow shift is showing up from multiple angles.`
      : `${label}은 ${topItems.map((item) => item.title).join(", ")} 쪽으로 묶이고 있어서, 같은 워크플로 변화가 여러 형태로 올라오고 있다는 신호에 가깝습니다.`;

  const hook =
    locale === "en"
      ? `${label} feels less like a random ranking and more like a map of where developers are moving next.`
      : `${label}은 그냥 순위표라기보다, 개발자들이 다음으로 어디로 움직이는지 보여주는 지도에 가깝습니다.`;

  return {
    title:
      locale === "en"
        ? `${label} Top ${board.items.length}`
        : `${label} TOP ${board.items.length}`,
    boardSummary,
    hook,
    shortPost:
      locale === "en"
        ? `${hook}\n\nI pulled today's ${label} board and trimmed it to the entries worth actually watching.\n\nThe common thread is not just hype. It is where real workflow leverage is starting to stack.\n\nWhich one would you test first?`
        : `${hook}\n\n오늘 ${label} 보드를 기준으로, 실제로 볼 만한 항목만 추려봤습니다.\n\n공통점은 단순 화제가 아니라 실제 워크플로우 이득이 쌓이는 방향이라는 점입니다.\n\n여기서 가장 먼저 써보고 싶은 건 무엇인가요?`,
    threadPosts: board.items.map((item) =>
      locale === "en"
        ? `${item.rank}. ${item.title} — ${(item.facts[0] || item.summary).trim()}`
        : `${item.rank}. ${item.title} — ${(item.facts[0] || item.summary).trim()}`,
    ),
    firstComment:
      locale === "en"
        ? "I’d keep the source links and repo pages in the first reply so the main post stays clean."
        : "원문 링크와 레포 페이지는 메인 글보다 첫 댓글에 붙이는 편이 흐름이 더 깔끔합니다.",
    followUpReplies:
      locale === "en"
        ? [
            "Which one feels like a real workflow shift instead of a short-lived spike?",
            "If you want, I can turn this same board into a tighter operator-focused take next.",
          ]
        : [
            "여기서 단기 화제 말고 실제 워크플로 변화로 이어질 건 뭐라고 보시나요?",
            "원하면 같은 보드로 실무형 해석 버전도 바로 다시 뽑을 수 있습니다.",
          ],
    hashtags: buildBoardTags(board.id, channel),
    whyNow:
      locale === "en"
        ? "The board is most useful while the ranking is still moving, before the same names turn into background noise."
        : "이 보드는 순위가 살아 움직이는 지금 볼 때 가장 의미가 있습니다. 다들 아는 이름이 되기 전에 먼저 해석할 가치가 있습니다.",
    postingTips:
      locale === "en"
        ? [
            "Lead with the common pattern, not the raw list.",
            "Keep source links in the first comment or reply.",
            "Ask which item people would actually test first.",
          ]
        : [
            "순위 나열보다 공통 흐름을 먼저 던지세요.",
            "원문 링크는 첫 댓글이나 후속 답글로 빼세요.",
            "마지막엔 실제로 써볼 항목을 묻는 질문을 붙이세요.",
          ],
  };
}

function buildBoardTags(
  boardId: SignalWriterTrendBoard["id"],
  channel: SignalWriterTargetChannel,
) {
  const tagsByBoard: Record<SignalWriterTrendBoard["id"], string[]> = {
    github: ["GitHubTrending", "OpenSource", "DevTools"],
    npm: ["npm", "JavaScript", "DevTools"],
    frontend: ["Frontend", "React", "WebDev"],
    backend: ["Backend", "APIs", "Infra"],
    fullstack: ["Fullstack", "BuildInPublic", "DevTools"],
    skills: ["AIAgents", "MCP", "DevTools"],
  };

  const tags = [...(tagsByBoard[boardId] ?? ["DevTools", "OpenSource"])];
  if (channel === "linkedin") {
    return tags.slice(0, 3);
  }
  return tags.slice(0, 4);
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter(Boolean);
}

function normalizeTags(value: unknown) {
  return normalizeStringArray(value)
    .map((entry) => entry.replace(/^#/u, ""))
    .filter(Boolean)
    .slice(0, 4);
}

function getChannelLabel(locale: AppLocale, channel: SignalWriterTargetChannel) {
  if (locale === "en") {
    switch (channel) {
      case "x":
        return "X";
      case "linkedin":
        return "LinkedIn";
      default:
        return "Threads";
    }
  }

  switch (channel) {
    case "x":
      return "X / Twitter";
    case "linkedin":
      return "LinkedIn";
    default:
      return "Threads";
  }
}
