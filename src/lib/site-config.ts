import "server-only";

import { APP_META } from "@/lib/app-meta";

const DEFAULT_DEV_SITE_URL = "http://localhost:3000";

export function getSiteUrl() {
  const explicit = normalizeUrl(process.env.NEXT_PUBLIC_SITE_URL);
  if (explicit) {
    return explicit;
  }

  const productionHost = normalizeHost(process.env.VERCEL_PROJECT_PRODUCTION_URL);
  if (productionHost) {
    return `https://${productionHost}`;
  }

  const previewHost = normalizeHost(process.env.VERCEL_URL);
  if (previewHost) {
    return `https://${previewHost}`;
  }

  return DEFAULT_DEV_SITE_URL;
}

export function getCanonicalUrl(pathname = "/") {
  return new URL(pathname, getSiteUrl()).toString();
}

export function getRepositoryUrl() {
  return APP_META.repositoryUrl;
}

function normalizeUrl(value: string | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  try {
    return new URL(trimmed).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

function normalizeHost(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.replace(/^https?:\/\//, "").replace(/\/$/, "") : null;
}
