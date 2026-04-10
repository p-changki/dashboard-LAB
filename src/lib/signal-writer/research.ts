import "server-only";

import { randomUUID } from "node:crypto";

import {
  containsCliTranscriptLeakInStrings,
  isRecord,
  parseLastJsonObject,
} from "@/lib/ai/structured-output";
import { runSpawnTask } from "@/lib/ai-skills/runner";
import { checkCommandAvailable } from "@/lib/command-availability";
import type { AppLocale } from "@/lib/locale";
import {
  buildSignalWriterCodexArgs,
  unwrapSignalWriterCodexResult,
} from "@/lib/signal-writer/codex";
import { loadSignalWriterSourceContext } from "@/lib/signal-writer/source-context";
import type {
  SignalWriterAiRunner,
  SignalWriterDraftMode,
  SignalWriterResearchAngle,
  SignalWriterResearchModelResult,
  SignalWriterResearchResult,
  SignalWriterSignal,
  SignalWriterSourceContext,
  SignalWriterTargetChannel,
} from "@/lib/types";

const RESEARCH_TIMEOUT_MS = 70_000;

type ResearchPayload = {
  summary: string;
  keyPoints: string[];
  hooks: string[];
  angles: SignalWriterResearchAngle[];
  questions: string[];
  watchouts: string[];
  scores: {
    heat: number;
    novelty: number;
    debate: number;
    practical: number;
  };
};

export async function runSignalWriterResearch(
  signal: SignalWriterSignal,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
): Promise<SignalWriterResearchResult> {
  const createdAt = new Date().toISOString();
  const sourceContext = await loadSignalWriterSourceContext(signal);
  const [claude, codex] = await Promise.all([
    runResearchModel("claude", signal, locale, channel, sourceContext),
    runResearchModel("codex", signal, locale, channel, sourceContext),
  ]);

  const synthesis = synthesizeResearch(signal, locale, channel, claude, codex);

  return {
    signalId: signal.id,
    channel,
    createdAt,
    sourceContext,
    scores: {
      heat: averageScore(claude.heatScore, codex.heatScore),
      novelty: averageScore(claude.noveltyScore, codex.noveltyScore),
      debate: averageScore(claude.debateScore, codex.debateScore),
      practical: averageScore(claude.practicalScore, codex.practicalScore),
      overall: averageScore(
        averageScore(claude.heatScore, claude.noveltyScore, claude.debateScore, claude.practicalScore),
        averageScore(codex.heatScore, codex.noveltyScore, codex.debateScore, codex.practicalScore),
      ),
    },
    claude,
    codex,
    synthesis,
  };
}

async function runResearchModel(
  model: "claude" | "codex",
  signal: SignalWriterSignal,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
  sourceContext: SignalWriterSourceContext | null,
): Promise<SignalWriterResearchModelResult> {
  const available = await checkCommandAvailable(model);

  if (!available) {
    return buildFallbackResearchModelResult(model, signal, locale, channel, "unavailable", `${model} is unavailable.`);
  }

  const prompt = buildResearchPrompt(model, signal, locale, channel, sourceContext);

  try {
    const raw = await (async () => {
      if (model === "claude") {
        return runSpawnTask({
          command: "claude",
          args: ["-p", "--output-format", "text", "--effort", "low"],
          cwd: process.env.HOME || "/",
          input: prompt,
          timeoutMs: RESEARCH_TIMEOUT_MS,
        });
      }

      const outputPath = `/tmp/dashboard-lab-signal-writer-research-${randomUUID()}.txt`;
      const result = await runSpawnTask({
        command: "codex",
        args: buildSignalWriterCodexArgs(prompt, outputPath, "research"),
        cwd: process.env.HOME || "/",
        outputPath,
        timeoutMs: RESEARCH_TIMEOUT_MS,
      });
      return {
        ...result,
        output: unwrapSignalWriterCodexResult(
          result,
          locale,
          "research",
          "The research output is empty.",
        ),
        error: null,
      };
    })();

    if (raw.error || !raw.output) {
      return buildFallbackResearchModelResult(
        model,
        signal,
        locale,
        channel,
        "fallback",
        raw.error || "The research output is empty.",
      );
    }

    const parsed = parseResearchPayload(raw.output);

    if (!parsed) {
      return buildFallbackResearchModelResult(
        model,
        signal,
        locale,
        channel,
        "fallback",
        "The research output could not be parsed.",
      );
    }

    return {
      id: model,
      runner: model,
      status: "completed",
      summary: clampSentence(parsed.summary, 260),
      keyPoints: normalizeStringArray(parsed.keyPoints, 4),
      hooks: normalizeStringArray(parsed.hooks, 3),
      angles: normalizeAngles(parsed.angles),
      questions: normalizeStringArray(parsed.questions, 3),
      watchouts: normalizeStringArray(parsed.watchouts, 3),
      heatScore: clampScore(parsed.scores.heat),
      noveltyScore: clampScore(parsed.scores.novelty),
      debateScore: clampScore(parsed.scores.debate),
      practicalScore: clampScore(parsed.scores.practical),
    };
  } catch (error) {
    return buildFallbackResearchModelResult(
      model,
      signal,
      locale,
      channel,
      "failed",
      error instanceof Error ? error.message : "The research model failed.",
    );
  }
}

function buildResearchPrompt(
  model: "claude" | "codex",
  signal: SignalWriterSignal,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
  sourceContext: SignalWriterSourceContext | null,
) {
  const channelLabel = formatChannelLabel(locale, channel);
  const role =
    model === "claude"
      ? locale === "en"
        ? "You are a social strategist. Find why people would react, save, reply, or argue."
        : "당신은 소셜 전략가입니다. 사람들이 왜 반응하고, 저장하고, 답글 달고, 논쟁할지를 찾아내세요."
      : locale === "en"
        ? "You are a technical analyst. Find what changed, who it affects, and what practical workflow shift matters."
        : "당신은 기술 분석가입니다. 무엇이 바뀌었고, 누구에게 영향을 주며, 실무 워크플로우에서 무엇이 달라지는지 찾아내세요.";

  const responseShape =
    '{"summary":"string","keyPoints":["string"],"hooks":["string"],"angles":[{"label":"string","summary":"string","audience":"string"}],"questions":["string"],"watchouts":["string"],"scores":{"heat":0,"novelty":0,"debate":0,"practical":0}}';

  if (locale === "en") {
    return [
      role,
      `The target channel is ${channelLabel}.`,
      "Analyze this signal and return strict JSON only.",
      `JSON shape: ${responseShape}`,
      "Rules:",
      "- heat, novelty, debate, practical must be integers from 0 to 10.",
      "- hooks must contain 2 or 3 distinct options.",
      "- angles must contain 2 distinct angles with label, summary, and audience.",
      "- keyPoints must be practical and specific, not generic praise.",
      "- questions should be reply-driving or debate-driving.",
      "- watchouts should include overclaim risk, weak evidence, or hype risk when relevant.",
      `Signal title: ${signal.title}`,
      `Signal summary: ${signal.summary}`,
      `Why it matters now: ${signal.whyItMatters}`,
      `Source: ${signal.sourceName}`,
      `Category: ${signal.categoryLabel}`,
      `Tags: ${signal.tags.join(", ") || "none"}`,
      `Published at: ${signal.publishedAt}`,
      `Current score: ${signal.score}`,
      ...(sourceContext
        ? [
            `Source context: ${sourceContext.label}`,
            `Source summary: ${sourceContext.summary}`,
            `Source details: ${sourceContext.details.join(" | ")}`,
          ]
        : []),
    ].join("\n");
  }

  return [
    role,
    `게시 채널은 ${channelLabel}입니다.`,
    "이 시그널을 분석하고 JSON만 반환하세요.",
    `JSON 형태: ${responseShape}`,
    "규칙:",
    "- heat, novelty, debate, practical는 0~10 정수여야 합니다.",
    "- hooks는 서로 다른 훅 2~3개를 넣으세요.",
    "- angles는 label, summary, audience를 가진 서로 다른 관점 2개를 넣으세요.",
    "- keyPoints는 막연한 칭찬이 아니라 실제로 써먹을 수 있는 포인트여야 합니다.",
    "- questions는 답글이나 논쟁을 유도할 수 있어야 합니다.",
    "- watchouts에는 과장 위험, 근거 부족, 하이프 과잉 같은 주의점을 넣으세요.",
    `시그널 제목: ${signal.title}`,
    `시그널 요약: ${signal.summary}`,
    `왜 지금 중요한가: ${signal.whyItMatters}`,
    `출처: ${signal.sourceName}`,
    `카테고리: ${signal.categoryLabel}`,
    `태그: ${signal.tags.join(", ") || "없음"}`,
    `발행 시각: ${signal.publishedAt}`,
    `현재 점수: ${signal.score}`,
    ...(sourceContext
      ? [
          `원문 컨텍스트: ${sourceContext.label}`,
          `원문 요약: ${sourceContext.summary}`,
          `원문 세부 정보: ${sourceContext.details.join(" | ")}`,
        ]
      : []),
  ].join("\n");
}

function parseResearchPayload(raw: string): ResearchPayload | null {
  const parsed = parseLastJsonObject(raw, (value): value is Partial<{
      summary: string;
      keyPoints: string[];
      hooks: string[];
      angles: Array<Partial<SignalWriterResearchAngle>>;
      questions: string[];
      watchouts: string[];
      scores: Partial<Record<"heat" | "novelty" | "debate" | "practical", number>>;
    }> => {
      if (!isRecord(value)) {
        return false;
      }

      return typeof value.summary === "string" && isRecord(value.scores);
    });

  if (!parsed) {
    return null;
  }

  const summary = typeof parsed.summary === "string" ? parsed.summary : "";
  const keyPoints = Array.isArray(parsed.keyPoints) ? parsed.keyPoints.filter(isString) : [];
  const hooks = Array.isArray(parsed.hooks) ? parsed.hooks.filter(isString) : [];
  const angles = Array.isArray(parsed.angles)
    ? parsed.angles.map((angle) => ({
        label: typeof angle?.label === "string" ? angle.label : "",
        summary: typeof angle?.summary === "string" ? angle.summary : "",
        audience: typeof angle?.audience === "string" ? angle.audience : "",
      }))
    : [];
  const questions = Array.isArray(parsed.questions) ? parsed.questions.filter(isString) : [];
  const watchouts = Array.isArray(parsed.watchouts) ? parsed.watchouts.filter(isString) : [];

  if (
    containsCliTranscriptLeakInStrings([
      summary,
      ...keyPoints,
      ...hooks,
      ...questions,
      ...watchouts,
      ...angles.flatMap((angle) => [angle.label, angle.summary, angle.audience]),
    ])
  ) {
    return null;
  }

  return {
    summary,
    keyPoints,
    hooks,
    angles,
    questions,
    watchouts,
    scores: {
      heat: Number(parsed.scores?.heat ?? 0),
      novelty: Number(parsed.scores?.novelty ?? 0),
      debate: Number(parsed.scores?.debate ?? 0),
      practical: Number(parsed.scores?.practical ?? 0),
    },
  };
}

function buildFallbackResearchModelResult(
  model: "claude" | "codex",
  signal: SignalWriterSignal,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
  status: "fallback" | "unavailable" | "failed",
  error?: string,
): SignalWriterResearchModelResult {
  const practicalityBias = hasOneOf(signal, ["sdk", "cli", "workflow", "api", "tool", "agent", "mcp"]);
  const debateBias = hasOneOf(signal, ["why", "future", "debate", "versus", "opinion", "take", "에이전트", "왜", "논쟁"]);
  const baseHeat = clampScore(Math.round(signal.score / 8));
  const heatScore = clampScore(baseHeat + (model === "claude" ? 1 : 0));
  const noveltyScore = clampScore(baseHeat + (signal.categoryId === "mcp-ecosystem" ? 2 : 0));
  const debateScore = clampScore(baseHeat + (debateBias || model === "claude" ? 2 : 0));
  const practicalScore = clampScore(baseHeat + (practicalityBias || model === "codex" ? 2 : 0));
  const fallbackAngle =
    model === "claude"
      ? {
          label: locale === "en" ? "Reaction angle" : "반응 포인트",
          summary:
            locale === "en"
              ? "Frame why people should care right now, not what the headline literally says."
              : "헤드라인 자체보다 왜 지금 사람들이 반응할지를 먼저 잡는 관점입니다.",
          audience: locale === "en" ? "builders and curious early adopters" : "빌더와 얼리어답터",
        }
      : {
          label: locale === "en" ? "Workflow angle" : "실무 영향 포인트",
          summary:
            locale === "en"
              ? "Translate the update into a concrete workflow or shipping implication."
              : "업데이트를 실제 워크플로우나 배포 영향으로 번역하는 관점입니다.",
          audience: locale === "en" ? "developers and operators" : "개발자와 운영자",
        };

  const fallbackHook =
    model === "claude"
      ? locale === "en"
        ? `The headline is not the real story. ${signal.title} changes the conversation underneath.`
        : `헤드라인보다 중요한 건 맥락입니다. ${signal.title}은 밑단의 흐름을 바꾸고 있습니다.`
      : locale === "en"
        ? `${signal.title} matters if you care about how the workflow actually changes.`
        : `${signal.title}은 실제 워크플로우가 어떻게 바뀌는지를 보면 더 중요합니다.`

  return {
    id: model,
    runner: "template",
    status,
    summary:
      model === "claude"
        ? locale === "en"
          ? "Social-first fallback research: focus on reaction, timing, and community response."
          : "소셜 관점 fallback 분석입니다. 반응 포인트와 타이밍, 커뮤니티 반응을 우선 봅니다."
        : locale === "en"
          ? "Technical fallback research: focus on implementation impact and practical workflow change."
          : "기술 관점 fallback 분석입니다. 구현 영향과 실제 워크플로우 변화를 우선 봅니다.",
    keyPoints: [
      signal.whyItMatters,
      signal.summary,
    ].map((item) => clampSentence(item, 120)).slice(0, 2),
    hooks: [fallbackHook],
    angles: [fallbackAngle],
    questions: [
      locale === "en"
        ? "Does this change real workflow behavior, or is it still mostly a demo signal?"
        : "이게 실제 워크플로우를 바꾸는 변화일까요, 아니면 아직 데모 단계 신호일까요?",
    ],
    watchouts: [
      locale === "en"
        ? "Avoid overstating adoption before there is evidence from real teams."
        : "실제 팀 적용 근거가 나오기 전에는 과장된 확산 서술을 피하는 편이 좋습니다.",
    ],
    heatScore,
    noveltyScore,
    debateScore,
    practicalScore,
    error,
  };
}

function synthesizeResearch(
  signal: SignalWriterSignal,
  locale: AppLocale,
  channel: SignalWriterTargetChannel,
  claude: SignalWriterResearchModelResult,
  codex: SignalWriterResearchModelResult,
) {
  const heat = averageScore(claude.heatScore, codex.heatScore);
  const novelty = averageScore(claude.noveltyScore, codex.noveltyScore);
  const debate = averageScore(claude.debateScore, codex.debateScore);
  const practical = averageScore(claude.practicalScore, codex.practicalScore);
  const primary = practical > debate ? codex : claude;
  const secondary = primary.id === "claude" ? codex : claude;
  const recommendedMode = chooseRecommendedMode(channel, heat, novelty, debate, practical);
  const recommendedRunner = chooseRecommendedRunner(claude, codex, debate, practical);
  const keyPoints = dedupeStrings([...primary.keyPoints, ...secondary.keyPoints]).slice(0, 4);
  const watchouts = dedupeStrings([...claude.watchouts, ...codex.watchouts]).slice(0, 3);
  const bestQuestion =
    primary.questions[0]
    || secondary.questions[0]
    || (locale === "en"
      ? "What would have to change for this to matter in real work?"
      : "이게 실제 업무에서 중요해지려면 무엇이 더 바뀌어야 할까요?");
  const bestHook =
    claude.hooks[0]
    || codex.hooks[0]
    || (locale === "en"
      ? `${signal.title} matters more for the workflow shift than for the headline itself.`
      : `${signal.title}은 헤드라인 자체보다 워크플로우 변화 측면에서 더 중요합니다.`);
  const primaryAngle =
    primary.angles[0]
    || secondary.angles[0]
    || {
      label: locale === "en" ? "Early signal" : "초기 신호",
      summary:
        locale === "en"
          ? "Treat it as an early signal worth interpreting before the consensus hardens."
          : "컨센서스가 굳기 전에 먼저 해석할 만한 초기 신호로 보는 관점입니다.",
      audience: locale === "en" ? "builders" : "빌더",
    };

  return {
    summary:
      locale === "en"
        ? `Claude says the reaction angle is ${claude.summary.toLowerCase()} Codex says the practical shift is ${codex.summary.toLowerCase()}`
        : `Claude는 ${claude.summary} Codex는 ${codex.summary}`,
    whyNow: buildWhyNow(locale, heat, novelty, debate, practical),
    bestHook,
    bestQuestion,
    recommendedMode,
    recommendedRunner,
    primaryAngle,
    keyPoints,
    watchouts,
  };
}

function chooseRecommendedMode(
  channel: SignalWriterTargetChannel,
  heat: number,
  novelty: number,
  debate: number,
  practical: number,
): SignalWriterDraftMode {
  if (debate >= 7) {
    return "opinion";
  }

  if (practical >= 7 || channel === "linkedin") {
    return "insight";
  }

  if (heat >= 7 || novelty >= 7) {
    return "viral";
  }

  return "news-brief";
}

function chooseRecommendedRunner(
  claude: SignalWriterResearchModelResult,
  codex: SignalWriterResearchModelResult,
  debate: number,
  practical: number,
): Exclude<SignalWriterAiRunner, "auto" | "gemini" | "openai"> {
  if (claude.status !== "completed" && codex.status !== "completed") {
    return "template";
  }

  if (practical > debate && codex.status === "completed") {
    return "codex";
  }

  if (claude.status === "completed") {
    return "claude";
  }

  return codex.status === "completed" ? "codex" : "template";
}

function buildWhyNow(
  locale: AppLocale,
  heat: number,
  novelty: number,
  debate: number,
  practical: number,
) {
  if (locale === "en") {
    if (heat >= 8) {
      return "The timing is strong because the topic is hot enough to pull attention before it becomes background noise.";
    }

    if (debate >= 7) {
      return "The best timing comes from the disagreement angle, not from repeating the release notes.";
    }

    if (practical >= 7) {
      return "This is a good moment to post because the workflow implication is clearer than usual.";
    }

    if (novelty >= 7) {
      return "This is still early enough to feel new, which makes a sharper take more valuable.";
    }

    return "The timing is decent if you add a point of view instead of reposting the headline.";
  }

  if (heat >= 8) {
    return "지금은 이 주제가 아직 배경 잡음이 되기 전이라 주목을 끌기 좋은 타이밍입니다.";
  }

  if (debate >= 7) {
    return "지금 포인트는 릴리즈 노트 반복보다 논쟁 지점을 먼저 잡는 데 있습니다.";
  }

  if (practical >= 7) {
    return "실무 영향이 비교적 선명해서 지금 정리해두기 좋은 타이밍입니다.";
  }

  if (novelty >= 7) {
    return "아직 새로움이 살아 있어서 요약보다 해석형 글이 더 잘 맞는 타이밍입니다.";
  }

  return "헤드라인 반복이 아니라 관점을 넣으면 지금도 충분히 글감으로 쓸 수 있습니다.";
}

function hasOneOf(signal: SignalWriterSignal, patterns: string[]) {
  const haystack = [
    signal.title,
    signal.summary,
    signal.whyItMatters,
    signal.sourceName,
    signal.categoryLabel,
    signal.tags.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return patterns.some((pattern) => haystack.includes(pattern.toLowerCase()));
}

function normalizeAngles(angles: SignalWriterResearchAngle[]) {
  return angles
    .map((angle) => ({
      label: angle.label.trim(),
      summary: angle.summary.trim(),
      audience: angle.audience.trim(),
    }))
    .filter((angle) => angle.label && angle.summary && angle.audience)
    .slice(0, 2);
}

function normalizeStringArray(items: string[], limit: number) {
  return dedupeStrings(items.map((item) => clampSentence(item, 160)).filter(Boolean)).slice(0, limit);
}

function dedupeStrings(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase().replace(/\s+/g, " ").trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function averageScore(...values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return clampScore(Math.round(total / values.length));
}

function clampScore(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.min(10, Math.round(value)));
}

function clampSentence(value: string, maxLength: number) {
  const trimmed = value.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength - 3).trimEnd()}...`;
}

function formatChannelLabel(locale: AppLocale, channel: SignalWriterTargetChannel) {
  if (locale === "en") {
    return {
      threads: "Threads",
      x: "X / Twitter",
      linkedin: "LinkedIn",
    }[channel];
  }

  return {
    threads: "Threads",
    x: "X / Twitter",
    linkedin: "LinkedIn",
  }[channel];
}

function isString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
