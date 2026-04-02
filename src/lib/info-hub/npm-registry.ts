const DAY_MS = 24 * 60 * 60_000;
const NPM_FRESHNESS_FALLBACK_ISO = new Date(Date.now() - 45 * DAY_MS).toISOString();

export interface NpmRegistrySearchResult {
  package: {
    name: string;
    description?: string;
    version: string;
    links?: { npm?: string };
    keywords?: string[];
  };
  score?: { final?: number };
}

interface NpmRegistryPackageDocument {
  time?: Record<string, string>;
  "dist-tags"?: {
    latest?: string;
  };
}

export interface NpmRegistryPackageMetadata {
  modifiedAt?: string;
  latestPublishedAt?: string;
  latestVersion?: string;
}

export async function fetchNpmSearchResults(
  text: string,
  size: number,
  options?: { popularity?: number },
): Promise<NpmRegistrySearchResult[]> {
  const url = new URL("https://registry.npmjs.org/-/v1/search");
  url.searchParams.set("text", text);
  url.searchParams.set("size", String(size));
  url.searchParams.set("popularity", String(options?.popularity ?? 1));

  const payload = await fetch(url, { cache: "no-store" })
    .then((response) => response.json() as Promise<{ objects?: NpmRegistrySearchResult[] }>)
    .catch(() => ({ objects: [] as NpmRegistrySearchResult[] }));

  return payload.objects ?? [];
}

export async function fetchNpmPackageMetadata(
  packageName: string,
): Promise<NpmRegistryPackageMetadata | null> {
  const url = `https://registry.npmjs.org/${encodeURIComponent(packageName)}`;

  const payload = await fetch(url, { cache: "no-store" })
    .then(async (response) => {
      if (!response.ok) {
        return null;
      }

      return (await response.json()) as NpmRegistryPackageDocument;
    })
    .catch(() => null);

  if (!payload) {
    return null;
  }

  const latestVersion = payload["dist-tags"]?.latest;
  return {
    modifiedAt: normalizeIso(payload.time?.modified),
    latestPublishedAt: normalizeIso(
      latestVersion ? payload.time?.[latestVersion] : undefined,
    ),
    latestVersion,
  };
}

export function getNpmPublishedAt(metadata: NpmRegistryPackageMetadata | null) {
  return metadata?.modifiedAt ?? metadata?.latestPublishedAt ?? NPM_FRESHNESS_FALLBACK_ISO;
}

export function getNpmFreshnessScore(metadata: NpmRegistryPackageMetadata | null) {
  const reference = metadata?.modifiedAt ?? metadata?.latestPublishedAt;
  if (!reference) {
    return 0;
  }

  const ageDays = Math.max(
    0,
    (Date.now() - new Date(reference).getTime()) / DAY_MS,
  );

  return Math.max(0, 18 - ageDays * 0.6);
}

function normalizeIso(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}
