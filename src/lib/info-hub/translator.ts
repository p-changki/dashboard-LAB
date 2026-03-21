import { translate } from "@vitalets/google-translate-api";

export async function translateTitle(title: string, isKorean: boolean) {
  if (!title || isKorean) {
    return null;
  }

  try {
    const result = await translate(title, { to: "ko" });
    return result.text || null;
  } catch {
    return null;
  }
}
