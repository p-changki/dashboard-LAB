import path from "node:path";
import matter from "gray-matter";

import type { SkillTemplate } from "@/lib/types";
import {
  CLAUDE_COMMANDS_DIR,
  CLAUDE_SKILLS_DIR,
  basenameWithoutExtension,
  getFirstMeaningfulLine,
  listDirectories,
  listFiles,
  readUtf8,
} from "@/lib/parsers/shared";

const BUILTIN_TEMPLATES: SkillTemplate[] = [
  {
    id: "youtube",
    name: "/youtube",
    description: "유튜브 영상 자막 추출 후 요약과 정리를 수행합니다.",
    runner: "claude",
    promptTemplate: "/youtube {{url}}",
    inputs: [{ name: "url", label: "YouTube URL", type: "url", placeholder: "https://youtube.com/watch?v=...", required: true }],
    icon: "play-circle",
    category: "content",
    builtin: true,
  },
  {
    id: "naver-blog",
    name: "/naver-blog",
    description: "주제를 바탕으로 블로그 초안과 마케팅 문구를 생성합니다.",
    runner: "claude",
    promptTemplate: "/naver-blog {{topic}}",
    inputs: [{ name: "topic", label: "주제", type: "text", placeholder: "예: MCP 활용법", required: true }],
    icon: "pen-tool",
    category: "content",
    builtin: true,
  },
  {
    id: "web-to-markdown",
    name: "/web-to-markdown",
    description: "웹페이지를 마크다운으로 변환하고 정리합니다.",
    runner: "claude",
    promptTemplate: "/web-to-markdown {{url}}",
    inputs: [{ name: "url", label: "웹페이지 URL", type: "url", placeholder: "https://...", required: true }],
    icon: "file-down",
    category: "research",
    builtin: true,
  },
  {
    id: "codex-review",
    name: "codex review",
    description: "지정한 프로젝트에서 변경분을 읽고 코드 리뷰를 수행합니다.",
    runner: "codex",
    promptTemplate:
      "Review the current git diff in {{directory}}. Focus on bugs, regressions, edge cases, and missing tests.",
    inputs: [{ name: "directory", label: "프로젝트 경로", type: "text", placeholder: "~/Desktop/my-project", required: true }],
    icon: "git-pull-request",
    category: "automation",
    builtin: true,
  },
  {
    id: "custom",
    name: "커스텀 프롬프트",
    description: "Claude에 자유 프롬프트를 전달합니다.",
    runner: "claude",
    promptTemplate: "{{prompt}}",
    inputs: [{ name: "prompt", label: "프롬프트", type: "textarea", placeholder: "실행할 프롬프트를 입력하세요.", required: true }],
    icon: "sparkles",
    category: "custom",
    builtin: true,
  },
];

export async function getSkillTemplates() {
  const [commandTemplates, discoveredSkills] = await Promise.all([
    loadCommandTemplates(),
    loadSkillFolderTemplates(),
  ]);

  return dedupeTemplates([...commandTemplates, ...discoveredSkills, ...BUILTIN_TEMPLATES]);
}

async function loadCommandTemplates() {
  const files = await listFiles(CLAUDE_COMMANDS_DIR, (name) => name.endsWith(".md"));
  const templates = await Promise.all(files.map((filePath) => buildDiscoveredTemplate(filePath, "command")));
  return templates.filter((template): template is SkillTemplate => template !== null);
}

async function loadSkillFolderTemplates() {
  const directories = await listDirectories(CLAUDE_SKILLS_DIR);
  const templates = await Promise.all(
    directories.map(async (directoryPath) => {
      const promptPath = path.join(directoryPath, "prompt.md");
      const skillPath = path.join(directoryPath, "skill.md");
      const existingPath = (await readUtf8(promptPath)) ? promptPath : skillPath;
      return buildDiscoveredTemplate(existingPath, "skill");
    }),
  );

  return templates.filter((template): template is SkillTemplate => template !== null);
}

async function buildDiscoveredTemplate(filePath: string, kind: "command" | "skill") {
  const source = await readUtf8(filePath);

  if (!source) {
    return null;
  }

  const parsed = matter(source);
  const rawName = kind === "command" ? basenameWithoutExtension(filePath) : path.basename(path.dirname(filePath));
  const configuredName = typeof parsed.data.name === "string" ? parsed.data.name.trim() : rawName;
  const skillName = configuredName.startsWith("/") ? configuredName : `/${configuredName}`;
  const description = getDescription(parsed.content, parsed.data.description, skillName);
  const builtinTemplate = BUILTIN_TEMPLATES.find((template) => template.id === normalizeTemplateId(rawName));

  const template: SkillTemplate = {
    id: normalizeTemplateId(rawName),
    name: skillName,
    description,
    runner: "claude",
    promptTemplate: builtinTemplate?.promptTemplate ?? `${skillName} {{arguments}}`,
    inputs: builtinTemplate?.inputs ?? [{ name: "arguments", label: "추가 입력", type: "textarea", placeholder: "필요한 URL, 키워드, 지시사항을 입력하세요.", required: false }],
    icon: builtinTemplate?.icon ?? "sparkles",
    category: builtinTemplate?.category ?? "custom",
    builtin: false,
  };

  return template;
}

function dedupeTemplates(templates: SkillTemplate[]) {
  const map = new Map<string, SkillTemplate>();
  templates.forEach((template) => {
    if (!map.has(template.id)) {
      map.set(template.id, template);
    }
  });
  return [...map.values()];
}

function normalizeTemplateId(rawName: string) {
  return rawName.toLowerCase().replace(/[^a-z0-9-]+/g, "-");
}

function getDescription(content: string, frontmatterDescription: unknown, skillName: string) {
  if (typeof frontmatterDescription === "string" && frontmatterDescription.trim()) {
    return frontmatterDescription.trim();
  }

  return getFirstMeaningfulLine(content) || `${skillName} 사용자 정의 스킬`;
}
