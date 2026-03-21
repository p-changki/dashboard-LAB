import path from "node:path";

import type { CodexInfo, CodexSkill } from "@/lib/types";

import {
  CODEX_SKILLS_DIR,
  detectCliVersion,
  getFirstMeaningfulLine,
  listDirectories,
  pathExists,
  parseMarkdown,
  readUtf8,
  resolveMarkdownFile,
  summarizeText,
  toPosixPath,
  HOME_DIR,
} from "./shared";

export async function parseCodexSkills(): Promise<CodexSkill[]> {
  return parseSkillDirectory(CODEX_SKILLS_DIR, "codex-cli");
}

export async function parseCodexPromptSkills(): Promise<CodexSkill[]> {
  const directoryPath = await resolveCodexPromptSkillsDirectory();

  if (!directoryPath) {
    return [];
  }

  return parseSkillDirectory(directoryPath, "codex-prompt");
}

export async function parseCodexRole(): Promise<{
  hasRoleFile: boolean;
  roleSummary: string;
  roleFilePath: string;
}> {
  const roleFilePath = (await resolveCodexRoleFile()) ?? "";

  if (!roleFilePath) {
    return {
      hasRoleFile: false,
      roleSummary: "",
      roleFilePath: "",
    };
  }

  const raw = await readUtf8(roleFilePath);

  return {
    hasRoleFile: Boolean(raw),
    roleSummary: raw ? summarizeText(raw, 5) : "",
    roleFilePath: toPosixPath(roleFilePath),
  };
}

export async function parseCodexInfo(): Promise<CodexInfo> {
  const [skills, promptSkills, role] = await Promise.all([
    parseCodexSkills(),
    parseCodexPromptSkills(),
    parseCodexRole(),
  ]);

  return {
    version: await detectCliVersion("codex"),
    skills,
    promptSkills,
    hasRoleFile: role.hasRoleFile,
    roleSummary: role.roleSummary,
    roleFilePath: role.roleFilePath,
  };
}

async function parseSkillDirectory(
  directoryPath: string,
  source: CodexSkill["source"],
): Promise<CodexSkill[]> {
  const directories = await listDirectories(directoryPath);

  const skills = await Promise.all(
    directories.map(async (skillDirectoryPath) => {
      const markdownFile = await resolveMarkdownFile(skillDirectoryPath, [
        "SKILL.md",
        "skill.md",
        "README.md",
      ]);

      if (!markdownFile) {
        return null;
      }

      const raw = await readUtf8(markdownFile);

      if (!raw) {
        return null;
      }

      const { frontmatter, body } = parseMarkdown(raw);
      const name = path.basename(skillDirectoryPath);
      const description =
        typeof frontmatter.description === "string"
          ? frontmatter.description
          : getFirstMeaningfulLine(body) || name;

      return {
        name,
        description,
        source,
        filePath: toPosixPath(markdownFile),
      };
    }),
  );

  return skills.filter((skill): skill is CodexSkill => skill !== null);
}

async function resolveCodexPromptSkillsDirectory(): Promise<string | null> {
  return findCodexPromptPath("SKILLS");
}

async function resolveCodexRoleFile(): Promise<string | null> {
  return findCodexPromptPath("ROLE.md");
}

async function findCodexPromptPath(targetName: "SKILLS" | "ROLE.md") {
  const desktopPath = path.join(HOME_DIR, "Desktop");
  const desktopDirectories = await listDirectories(desktopPath, {
    includeHidden: true,
  });

  for (const directoryPath of desktopDirectories) {
    const baseName = path.basename(directoryPath).toLowerCase();

    if (!baseName.includes("codex")) {
      continue;
    }

    const candidate = path.join(directoryPath, targetName);

    if (await pathExists(candidate)) {
      return candidate;
    }
  }

  return null;
}
