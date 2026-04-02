import type { GeminiInfo, GeminiSettings } from "@/lib/types";

import {
  detectCliVersion,
  GEMINI_POLICY_FILE,
  GEMINI_SETTINGS_FILE,
  isRecord,
  maskSensitiveData,
  readJsonObject,
  readUtf8,
  summarizeText,
  toPosixPath,
} from "./shared";

export async function parseGeminiSettings(): Promise<GeminiSettings> {
  const settings = maskSensitiveData(await readJsonObject(GEMINI_SETTINGS_FILE));
  const authType = getGeminiAuthType(settings);
  const version = await detectCliVersion("gemini");

  return {
    version,
    authType,
    settings,
    filePath: toPosixPath(GEMINI_SETTINGS_FILE),
  };
}

export async function parseGeminiPolicy(): Promise<{
  policySummary: string;
  filePath: string;
}> {
  const raw = await readUtf8(GEMINI_POLICY_FILE);

  return {
    policySummary: raw ? summarizeText(raw, 5) : "",
    filePath: toPosixPath(GEMINI_POLICY_FILE),
  };
}

export async function parseGeminiInfo(): Promise<GeminiInfo> {
  const [settings, policy] = await Promise.all([
    parseGeminiSettings(),
    parseGeminiPolicy(),
  ]);

  return {
    version: settings.version,
    authType: settings.authType,
    policySummary: policy.policySummary,
    settings: settings.settings,
    settingsPath: settings.filePath,
    policyPath: policy.filePath,
  };
}

function getGeminiAuthType(settings: Record<string, unknown>): string {
  const security = isRecord(settings.security) ? settings.security : {};
  const auth = isRecord(security.auth) ? security.auth : {};

  if (typeof auth.selectedType === "string") {
    return auth.selectedType;
  }

  return "unknown";
}
