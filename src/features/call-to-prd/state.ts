import type { DashboardNavigationMode } from "@/components/layout/TabNav";
import type { ProjectsLiteResponse } from "@/lib/types";

export type InputMode = "file" | "text";
export type SubTab = "intake" | "viewer" | "history";

export const SAVED_PAGE_SIZE = 6;

export interface CallToPrdProjectsResponse extends ProjectsLiteResponse {
  currentProjectPath?: string | null;
}

export interface CallToPrdTabProps {
  mode?: DashboardNavigationMode;
}
