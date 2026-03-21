"use client";

import type { CallDocPreset, CallDocType } from "@/lib/call-to-prd/document-config";
import type { CallDocTemplateSet, CallGenerationMode } from "@/lib/types/call-to-prd";

const STORAGE_KEY = "call-to-prd:template-sets";

interface SaveTemplateOptions {
  id?: string;
  name: string;
  projectName?: string | null;
  projectPath?: string | null;
  generationMode: CallGenerationMode;
  generationPreset: CallDocPreset;
  selectedDocTypes: CallDocType[];
}

export function readCallDocTemplateSets(): CallDocTemplateSet[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const items = raw ? (JSON.parse(raw) as CallDocTemplateSet[]) : [];
    return items.map((item) => ({
      ...item,
      generationMode: item.generationMode ?? "claude",
    }));
  } catch {
    return [];
  }
}

export function saveCallDocTemplateSet(options: SaveTemplateOptions): CallDocTemplateSet[] {
  const items = readCallDocTemplateSets();
  const now = new Date().toISOString();

  const nextItem: CallDocTemplateSet = {
    id: options.id ?? crypto.randomUUID(),
    name: options.name,
    projectName: options.projectName ?? null,
    projectPath: options.projectPath ?? null,
    generationMode: options.generationMode,
    generationPreset: options.generationPreset,
    selectedDocTypes: options.selectedDocTypes,
    createdAt: items.find((item) => item.id === options.id)?.createdAt ?? now,
    updatedAt: now,
  };

  const nextItems = [nextItem, ...items.filter((item) => item.id !== nextItem.id)]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 20);

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  return nextItems;
}

export function deleteCallDocTemplateSet(id: string): CallDocTemplateSet[] {
  const nextItems = readCallDocTemplateSets().filter((item) => item.id !== id);

  if (typeof window !== "undefined") {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  }

  return nextItems;
}
