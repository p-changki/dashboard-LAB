export type AppLocale = "ko" | "en";

export const DEFAULT_LOCALE: AppLocale = "ko";

export function resolveLocale(value: string | null | undefined): AppLocale {
  return value === "en" ? "en" : "ko";
}

export function pickLocale<T>(
  locale: AppLocale,
  values: { ko: T; en: T },
) {
  return values[locale];
}

export function readLocaleFromHeaders(headers: Headers): AppLocale {
  const explicit = headers.get("x-dashboard-locale");
  if (explicit) {
    return resolveLocale(explicit);
  }

  const acceptLanguage = headers.get("accept-language")?.toLowerCase() ?? "";
  return acceptLanguage.startsWith("en") ? "en" : DEFAULT_LOCALE;
}
