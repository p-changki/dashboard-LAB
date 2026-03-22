import "server-only";

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { APP_META } from "@/lib/app-meta";
import { pickLocale, type AppLocale, DEFAULT_LOCALE } from "@/lib/locale";
import {
  CLAUDE_SETTINGS_FILE,
  CODEX_SKILLS_DIR,
  GEMINI_SETTINGS_FILE,
} from "@/lib/parsers/shared";
import { getRuntimeConfig } from "@/lib/runtime/config";
import {
  detectWhisperModelSync,
  getRuntimeCheckFixHint,
  getRuntimeCheckRemedy,
  isDesktopRuntime,
} from "@/lib/runtime/installer";
import { hasOpenAiApiKey, readRuntimeSettings } from "@/lib/runtime/settings";
import type {
  DashboardLabRuntimeCheck,
  DashboardLabRuntimePathCandidate,
  DashboardLabRuntimePathStatus,
  DashboardLabRuntimeSummaryResponse,
  DashboardLabRuntimeWorkflow,
  RuntimeCheckStatus,
} from "@/lib/types";

export function getRuntimeSummary(
  locale: AppLocale = DEFAULT_LOCALE,
): DashboardLabRuntimeSummaryResponse {
  const settings = readRuntimeSettings();
  const runtimeConfig = getRuntimeConfig();
  const diagnostics = buildRuntimeDiagnostics(runtimeConfig.paths.projectsRoot, locale);

  return {
    app: {
      slug: APP_META.slug,
      displayName: APP_META.displayName,
      launcherFileName: APP_META.launcherFileName,
    },
    settings,
    resolvedPaths: {
      projectsRoot: buildPathStatus(
        "projectsRoot",
        t(locale, "프로젝트 루트", "Projects Root"),
        runtimeConfig.paths.projectsRoot,
        true,
      ),
      prdSaveDir: buildPathStatus(
        "prdSaveDir",
        t(locale, "PRD 저장 경로", "PRD Save Directory"),
        runtimeConfig.paths.prdSaveDir,
        true,
      ),
      csContextsDir: buildPathStatus(
        "csContextsDir",
        t(locale, "CS 컨텍스트 경로", "CS Contexts Directory"),
        runtimeConfig.paths.csContextsDir,
        true,
      ),
      allowedRoots: runtimeConfig.paths.allowedRoots,
    },
    discovery: {
      projectsRootCandidates: buildCandidates(
        runtimeConfig.discovery.projectsRootCandidates,
        runtimeConfig.paths.projectsRoot,
      ),
    },
    integrations: {
      openaiConfigured: diagnostics.openaiConfigured,
    },
    checks: diagnostics.checks,
    workflows: diagnostics.workflows,
  };
}

function buildPathStatus(
  id: DashboardLabRuntimePathStatus["id"],
  label: string,
  targetPath: string | null,
  required: boolean,
): DashboardLabRuntimePathStatus {
  return {
    id,
    label,
    path: targetPath,
    exists: targetPath ? existsSync(targetPath) : false,
    required,
  };
}

function buildCandidates(
  candidates: string[],
  selected: string | null,
): DashboardLabRuntimePathCandidate[] {
  return candidates.map((candidate) => ({
    path: candidate,
    exists: existsSync(candidate),
    selected: candidate === selected,
  }));
}

function buildRuntimeDiagnostics(projectsRoot: string, locale: AppLocale) {
  const ffmpegResult = detectCommand("ffmpeg");
  const whisperResult = detectAnyCommand(["whisper", "whisper-cli"]);
  const whisperModelResult = detectWhisperModelSync();
  const claudeResult = detectCommand("claude");
  const codexResult = detectCommand("codex");
  const geminiResult = detectCommand("gemini");
  const desktopRuntime = isDesktopRuntime();
  const openaiConfigured = hasOpenAiApiKey();
  const checks: DashboardLabRuntimeCheck[] = [
    buildPlatformCheck(locale),
    desktopRuntime
      ? buildStaticCheck(
          "node",
          "Node.js",
          "pass",
          t(locale, "Electron 런타임 사용 중", "Running inside the packaged Electron app"),
          false,
          locale,
        )
      : buildCommandCheck("node", "Node.js", true, locale),
    desktopRuntime
      ? buildStaticCheck(
          "pnpm",
          "pnpm",
          "pass",
          t(locale, "패키지된 데스크톱 앱에서는 설치 불필요", "Not required inside the packaged desktop app"),
          false,
          locale,
        )
      : buildCommandCheck("pnpm", "pnpm", true, locale),
    buildCommandCheckFromResult("ffmpeg", "ffmpeg", ffmpegResult, false, locale),
    buildCommandCheckFromResult(
      "whisper",
      t(locale, "Whisper backend", "Whisper Backend"),
      whisperResult,
      false,
      locale,
    ),
    buildStaticCheck(
      "whisper-model",
      t(locale, "Whisper 모델", "Whisper Model"),
      whisperModelResult.exists ? "pass" : "warn",
      whisperModelResult.exists
        ? whisperModelResult.path
        : t(locale, `${whisperModelResult.path} 없음`, `Missing: ${whisperModelResult.path}`),
      false,
      locale,
    ),
    buildCommandCheckFromResult("claude", "Claude CLI", claudeResult, false, locale),
    buildCommandCheckFromResult("codex", "Codex CLI", codexResult, false, locale),
    buildCommandCheckFromResult("gemini", "Gemini CLI", geminiResult, false, locale),
    buildStaticCheck(
      "openai-api",
      "OpenAI API key",
      openaiConfigured ? "pass" : "warn",
      openaiConfigured
        ? t(locale, "로컬 API fallback 사용 가능", "Local API fallback is available")
        : t(locale, "설정되지 않음", "Not configured"),
      false,
      locale,
    ),
    buildPathCheck(
      "claude-config",
      t(locale, "Claude 설정", "Claude Config"),
      CLAUDE_SETTINGS_FILE,
      false,
      locale,
    ),
    buildPathCheck(
      "codex-skills",
      t(locale, "Codex 스킬 경로", "Codex Skills Path"),
      CODEX_SKILLS_DIR,
      false,
      locale,
    ),
    buildPathCheck(
      "gemini-config",
      t(locale, "Gemini 설정", "Gemini Config"),
      GEMINI_SETTINGS_FILE,
      false,
      locale,
    ),
    buildPathCheck(
      "projects-root",
      t(locale, "프로젝트 루트 존재", "Projects Root Exists"),
      projectsRoot,
      true,
      locale,
    ),
  ];

  return {
    openaiConfigured,
    checks,
    workflows: buildWorkflowReadiness(
      {
        projectsRoot,
        hasProjectsRoot: existsSync(projectsRoot),
        hasAssistantRunner:
          claudeResult.exists || codexResult.exists || geminiResult.exists || openaiConfigured,
        hasSkillRunner: claudeResult.exists || codexResult.exists,
        hasTextPrdRunner: claudeResult.exists || codexResult.exists || openaiConfigured,
        hasVoiceToolchain:
          ffmpegResult.exists && whisperResult.exists && whisperModelResult.exists,
        usesOpenAiFallback: openaiConfigured,
      },
      locale,
    ),
  };
}

function buildWorkflowReadiness(
  input: {
    projectsRoot: string;
    hasProjectsRoot: boolean;
    hasAssistantRunner: boolean;
    hasSkillRunner: boolean;
    hasTextPrdRunner: boolean;
    hasVoiceToolchain: boolean;
    usesOpenAiFallback: boolean;
  },
  locale: AppLocale,
): DashboardLabRuntimeWorkflow[] {
  return [
    {
      id: "workspace",
      label: "Projects / Doc Hub",
      status: input.hasProjectsRoot ? "pass" : "warn",
      detail: input.hasProjectsRoot
        ? t(locale, "프로젝트 구조와 문서를 바로 탐색할 수 있습니다.", "You can browse project structure and docs right away.")
        : t(locale, `프로젝트 루트를 저장해야 Projects와 Doc Hub가 정상 동작합니다. 현재 후보: ${input.projectsRoot}`, `Save a projects root before Projects and Doc Hub can work properly. Current candidate: ${input.projectsRoot}`),
    },
    {
      id: "cs-helper",
      label: "CS Helper",
      status: input.hasProjectsRoot && input.hasAssistantRunner ? "pass" : "warn",
      detail: input.hasProjectsRoot && input.hasAssistantRunner
        ? input.usesOpenAiFallback
          ? t(locale, "프로젝트 컨텍스트와 OpenAI fallback을 써서 고객 응답 초안을 만들 수 있습니다.", "You can draft customer replies with project context and the OpenAI fallback.")
          : t(locale, "프로젝트 컨텍스트와 설치된 AI CLI를 써서 고객 응답 초안을 만들 수 있습니다.", "You can draft customer replies with project context and an installed AI CLI.")
        : !input.hasProjectsRoot
          ? t(locale, "CS Helper를 제대로 쓰려면 프로젝트 루트를 먼저 저장해야 합니다.", "Save the projects root first to use CS Helper properly.")
          : t(locale, "Claude, Codex, Gemini CLI 중 하나 또는 OpenAI API key가 있어야 CS Helper를 실행할 수 있습니다.", "CS Helper needs Claude, Codex, Gemini CLI, or an OpenAI API key."),
    },
    {
      id: "ai-skills",
      label: "AI Skills",
      status: input.hasSkillRunner ? "pass" : "warn",
      detail: input.hasSkillRunner
        ? t(locale, "설치된 Claude 또는 Codex CLI로 반복 스킬을 실행할 수 있습니다.", "You can run repeatable skills with the installed Claude or Codex CLI.")
        : t(locale, "AI Skills는 Claude CLI 또는 Codex CLI가 준비되어야 실행할 수 있습니다.", "AI Skills requires Claude CLI or Codex CLI."),
    },
    {
      id: "prd-text",
      label: "Call → PRD (text)",
      status: input.hasTextPrdRunner ? "pass" : "warn",
      detail: input.hasTextPrdRunner
        ? t(locale, "메모나 회의 요약 텍스트만으로도 PRD 초안을 만들 수 있습니다.", "You can generate a PRD draft from typed notes or meeting summaries.")
        : t(locale, "텍스트 PRD 생성에는 Claude/Codex CLI 또는 OpenAI API key가 필요합니다.", "Text PRD generation requires Claude/Codex CLI or an OpenAI API key."),
    },
    {
      id: "prd-voice",
      label: "Call → PRD (voice)",
      status: input.hasTextPrdRunner && input.hasVoiceToolchain ? "pass" : "warn",
      detail: input.hasTextPrdRunner && input.hasVoiceToolchain
        ? t(locale, "오디오 업로드부터 전사, PRD 생성까지 한 번에 실행할 수 있습니다.", "You can go from audio upload to transcription and PRD generation in one flow.")
        : !input.hasTextPrdRunner
          ? t(locale, "음성 PRD를 쓰려면 먼저 Claude/Codex CLI 또는 OpenAI API key를 준비해야 합니다.", "Voice PRD needs Claude/Codex CLI or an OpenAI API key first.")
          : t(locale, "오디오 전사를 쓰려면 ffmpeg, Whisper backend, Whisper 모델이 모두 준비되어야 합니다.", "Audio transcription requires ffmpeg, a Whisper backend, and a Whisper model."),
    },
    {
      id: "info-hub",
      label: "Info Hub",
      status: "pass",
      detail: t(locale, "뉴스, 패키지 업데이트, 보안 변화는 별도 AI CLI 없이 바로 볼 수 있습니다.", "News, package updates, and security signals work without any AI CLI setup."),
    },
  ];
}

function buildPlatformCheck(locale: AppLocale): DashboardLabRuntimeCheck {
  const isMac = process.platform === "darwin";
  const isSupported = ["darwin", "win32", "linux"].includes(process.platform);

  return {
    id: "platform",
    label: t(locale, "지원 플랫폼", "Supported Platform"),
    status: isMac ? "pass" : isSupported ? "warn" : "fail",
    detail: isMac
      ? t(locale, `macOS ${process.arch} · 가장 안정적인 기준선`, `macOS ${process.arch} · most stable baseline`)
      : process.platform === "win32"
        ? t(locale, `Windows ${process.arch} · 실험적 지원`, `Windows ${process.arch} · experimental support`)
        : process.platform === "linux"
          ? t(locale, `Linux ${process.arch} · 실험적 지원`, `Linux ${process.arch} · experimental support`)
          : t(locale, `${process.platform} ${process.arch} · 미지원 플랫폼`, `${process.platform} ${process.arch} · unsupported platform`),
    required: true,
  };
}

function buildCommandCheck(
  id: string,
  label: string,
  required: boolean,
  locale: AppLocale,
): DashboardLabRuntimeCheck {
  return buildCommandCheckFromResult(id, label, detectCommand(id), required, locale);
}

function buildCommandCheckFromResult(
  id: string,
  label: string,
  result: CommandDetectionResult,
  required: boolean,
  locale: AppLocale,
): DashboardLabRuntimeCheck {
  const status: RuntimeCheckStatus = result.exists ? "pass" : "warn";

  return buildStaticCheck(
    id,
    label,
    status,
    result.exists
      ? [result.path, result.version].filter(Boolean).join(" · ")
      : t(locale, "설치되지 않음", "Not installed"),
    required,
    locale,
  );
}

function buildPathCheck(
  id: string,
  label: string,
  targetPath: string,
  required: boolean,
  locale: AppLocale,
): DashboardLabRuntimeCheck {
  const exists = existsSync(targetPath);

  return buildStaticCheck(
    id,
    label,
    exists ? "pass" : "warn",
    exists ? targetPath : t(locale, `${targetPath} 없음`, `Missing: ${targetPath}`),
    required,
    locale,
  );
}

function buildStaticCheck(
  id: string,
  label: string,
  status: RuntimeCheckStatus,
  detail: string,
  required: boolean,
  locale: AppLocale,
): DashboardLabRuntimeCheck {
  return {
    id,
    label,
    status,
    detail,
    required,
    fixHint: getRuntimeCheckFixHint(id, locale),
    remedy: getRuntimeCheckRemedy(id, locale),
  };
}

type CommandDetectionResult = {
  exists: boolean;
  path: string | null;
  version: string | null;
};

function detectAnyCommand(commands: string[]): CommandDetectionResult {
  for (const command of commands) {
    const result = detectCommand(command);
    if (result.exists) {
      return result;
    }
  }

  return {
    exists: false,
    path: null,
    version: null,
  };
}

function detectCommand(command: string): CommandDetectionResult {
  const commandPath = resolveCommandPath(command);

  if (!commandPath) {
    return {
      exists: false,
      path: null,
      version: null,
    };
  }

  const versionResult = spawnSync(commandPath, ["--version"], {
    encoding: "utf8",
    timeout: 5000,
  });
  const versionOutput = `${versionResult.stdout ?? ""}\n${versionResult.stderr ?? ""}`
    .trim()
    .split(/\r?\n/)[0] ?? null;

  return {
    exists: true,
    path: commandPath,
    version: versionOutput || null,
  };
}

function resolveCommandPath(command: string) {
  if (process.platform === "win32") {
    const result = spawnSync("where", [command], { encoding: "utf8" });
    if (result.status !== 0) {
      return "";
    }

    return result.stdout
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find(Boolean) ?? "";
  }

  const result = spawnSync("sh", ["-lc", `command -v '${command}'`], {
    encoding: "utf8",
  });
  return result.status === 0 ? result.stdout.trim() : "";
}

function t(locale: AppLocale, ko: string, en: string) {
  return pickLocale(locale, { ko, en });
}
