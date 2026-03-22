import "server-only";

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { APP_META } from "@/lib/app-meta";
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

export function getRuntimeSummary(): DashboardLabRuntimeSummaryResponse {
  const settings = readRuntimeSettings();
  const runtimeConfig = getRuntimeConfig();
  const diagnostics = buildRuntimeDiagnostics(runtimeConfig.paths.projectsRoot);

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
        "프로젝트 루트",
        runtimeConfig.paths.projectsRoot,
        true,
      ),
      prdSaveDir: buildPathStatus(
        "prdSaveDir",
        "PRD 저장 경로",
        runtimeConfig.paths.prdSaveDir,
        true,
      ),
      csContextsDir: buildPathStatus(
        "csContextsDir",
        "CS 컨텍스트 경로",
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

function buildRuntimeDiagnostics(projectsRoot: string) {
  const ffmpegResult = detectCommand("ffmpeg");
  const whisperResult = detectAnyCommand(["whisper", "whisper-cli"]);
  const whisperModelResult = detectWhisperModelSync();
  const claudeResult = detectCommand("claude");
  const codexResult = detectCommand("codex");
  const geminiResult = detectCommand("gemini");
  const desktopRuntime = isDesktopRuntime();
  const openaiConfigured = hasOpenAiApiKey();
  const checks: DashboardLabRuntimeCheck[] = [
    buildPlatformCheck(),
    desktopRuntime
      ? buildStaticCheck(
          "node",
          "Node.js",
          "pass",
          "Electron 런타임 사용 중",
          false,
        )
      : buildCommandCheck("node", "Node.js", true),
    desktopRuntime
      ? buildStaticCheck(
          "pnpm",
          "pnpm",
          "pass",
          "패키지된 데스크톱 앱에서는 설치 불필요",
          false,
        )
      : buildCommandCheck("pnpm", "pnpm", true),
    buildCommandCheckFromResult("ffmpeg", "ffmpeg", ffmpegResult, false),
    buildCommandCheckFromResult(
      "whisper",
      "Whisper backend",
      whisperResult,
      false,
    ),
    buildStaticCheck(
      "whisper-model",
      "Whisper 모델",
      whisperModelResult.exists ? "pass" : "warn",
      whisperModelResult.exists
        ? whisperModelResult.path
        : `${whisperModelResult.path} 없음`,
      false,
    ),
    buildCommandCheckFromResult("claude", "Claude CLI", claudeResult, false),
    buildCommandCheckFromResult("codex", "Codex CLI", codexResult, false),
    buildCommandCheckFromResult("gemini", "Gemini CLI", geminiResult, false),
    buildStaticCheck(
      "openai-api",
      "OpenAI API key",
      openaiConfigured ? "pass" : "warn",
      openaiConfigured
        ? "로컬 API fallback 사용 가능"
        : "설정되지 않음",
      false,
    ),
    buildPathCheck(
      "claude-config",
      "Claude 설정",
      CLAUDE_SETTINGS_FILE,
      false,
    ),
    buildPathCheck(
      "codex-skills",
      "Codex 스킬 경로",
      CODEX_SKILLS_DIR,
      false,
    ),
    buildPathCheck(
      "gemini-config",
      "Gemini 설정",
      GEMINI_SETTINGS_FILE,
      false,
    ),
    buildPathCheck(
      "projects-root",
      "프로젝트 루트 존재",
      projectsRoot,
      true,
    ),
  ];

  return {
    openaiConfigured,
    checks,
    workflows: buildWorkflowReadiness({
      projectsRoot,
      hasProjectsRoot: existsSync(projectsRoot),
      hasAssistantRunner:
        claudeResult.exists || codexResult.exists || geminiResult.exists || openaiConfigured,
      hasSkillRunner: claudeResult.exists || codexResult.exists,
      hasTextPrdRunner: claudeResult.exists || codexResult.exists || openaiConfigured,
      hasVoiceToolchain:
        ffmpegResult.exists && whisperResult.exists && whisperModelResult.exists,
      usesOpenAiFallback: openaiConfigured,
    }),
  };
}

function buildWorkflowReadiness(input: {
  projectsRoot: string;
  hasProjectsRoot: boolean;
  hasAssistantRunner: boolean;
  hasSkillRunner: boolean;
  hasTextPrdRunner: boolean;
  hasVoiceToolchain: boolean;
  usesOpenAiFallback: boolean;
}): DashboardLabRuntimeWorkflow[] {
  return [
    {
      id: "workspace",
      label: "Projects / Doc Hub",
      status: input.hasProjectsRoot ? "pass" : "warn",
      detail: input.hasProjectsRoot
        ? "프로젝트 구조와 문서를 바로 탐색할 수 있습니다."
        : `프로젝트 루트를 저장해야 Projects와 Doc Hub가 정상 동작합니다. 현재 후보: ${input.projectsRoot}`,
    },
    {
      id: "cs-helper",
      label: "CS Helper",
      status: input.hasProjectsRoot && input.hasAssistantRunner ? "pass" : "warn",
      detail: input.hasProjectsRoot && input.hasAssistantRunner
        ? input.usesOpenAiFallback
          ? "프로젝트 컨텍스트와 OpenAI fallback을 써서 고객 응답 초안을 만들 수 있습니다."
          : "프로젝트 컨텍스트와 설치된 AI CLI를 써서 고객 응답 초안을 만들 수 있습니다."
        : !input.hasProjectsRoot
          ? "CS Helper를 제대로 쓰려면 프로젝트 루트를 먼저 저장해야 합니다."
          : "Claude, Codex, Gemini CLI 중 하나 또는 OpenAI API key가 있어야 CS Helper를 실행할 수 있습니다.",
    },
    {
      id: "ai-skills",
      label: "AI Skills",
      status: input.hasSkillRunner ? "pass" : "warn",
      detail: input.hasSkillRunner
        ? "설치된 Claude 또는 Codex CLI로 반복 스킬을 실행할 수 있습니다."
        : "AI Skills는 Claude CLI 또는 Codex CLI가 준비되어야 실행할 수 있습니다.",
    },
    {
      id: "prd-text",
      label: "Call → PRD (text)",
      status: input.hasTextPrdRunner ? "pass" : "warn",
      detail: input.hasTextPrdRunner
        ? "메모나 회의 요약 텍스트만으로도 PRD 초안을 만들 수 있습니다."
        : "텍스트 PRD 생성에는 Claude/Codex CLI 또는 OpenAI API key가 필요합니다.",
    },
    {
      id: "prd-voice",
      label: "Call → PRD (voice)",
      status: input.hasTextPrdRunner && input.hasVoiceToolchain ? "pass" : "warn",
      detail: input.hasTextPrdRunner && input.hasVoiceToolchain
        ? "오디오 업로드부터 전사, PRD 생성까지 한 번에 실행할 수 있습니다."
        : !input.hasTextPrdRunner
          ? "음성 PRD를 쓰려면 먼저 Claude/Codex CLI 또는 OpenAI API key를 준비해야 합니다."
          : "오디오 전사를 쓰려면 ffmpeg, Whisper backend, Whisper 모델이 모두 준비되어야 합니다.",
    },
    {
      id: "info-hub",
      label: "Info Hub",
      status: "pass",
      detail: "뉴스, 패키지 업데이트, 보안 변화는 별도 AI CLI 없이 바로 볼 수 있습니다.",
    },
  ];
}

function buildPlatformCheck(): DashboardLabRuntimeCheck {
  const isMac = process.platform === "darwin";
  const isSupported = ["darwin", "win32", "linux"].includes(process.platform);

  return {
    id: "platform",
    label: "지원 플랫폼",
    status: isMac ? "pass" : isSupported ? "warn" : "fail",
    detail: isMac
      ? `macOS ${process.arch} · 가장 안정적인 기준선`
      : process.platform === "win32"
        ? `Windows ${process.arch} · 실험적 지원`
        : process.platform === "linux"
          ? `Linux ${process.arch} · 실험적 지원`
          : `${process.platform} ${process.arch} · 미지원 플랫폼`,
    required: true,
  };
}

function buildCommandCheck(
  id: string,
  label: string,
  required: boolean,
): DashboardLabRuntimeCheck {
  return buildCommandCheckFromResult(id, label, detectCommand(id), required);
}

function buildCommandCheckFromResult(
  id: string,
  label: string,
  result: CommandDetectionResult,
  required: boolean,
): DashboardLabRuntimeCheck {
  const status: RuntimeCheckStatus = result.exists
    ? "pass"
    : required
      ? "warn"
      : "warn";

  return buildStaticCheck(
    id,
    label,
    status,
    result.exists
      ? [result.path, result.version].filter(Boolean).join(" · ")
      : "설치되지 않음",
    required,
  );
}

function buildPathCheck(
  id: string,
  label: string,
  targetPath: string,
  required: boolean,
): DashboardLabRuntimeCheck {
  const exists = existsSync(targetPath);

  return buildStaticCheck(
    id,
    label,
    exists ? "pass" : "warn",
    exists ? targetPath : `${targetPath} 없음`,
    required,
  );
}

function buildStaticCheck(
  id: string,
  label: string,
  status: RuntimeCheckStatus,
  detail: string,
  required: boolean,
): DashboardLabRuntimeCheck {
  return {
    id,
    label,
    status,
    detail,
    required,
    fixHint: getRuntimeCheckFixHint(id),
    remedy: getRuntimeCheckRemedy(id),
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
