"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getInfoHubCopy } from "@/features/info-hub/copy";
import type { DashboardLabAutoRefreshMode } from "@/lib/client/daily-auto-refresh";

interface InfoHubToolbarProps {
  loading: boolean;
  onRefresh: () => void;
  autoRefreshMode: DashboardLabAutoRefreshMode;
  onToggleAutoRefreshMode: () => void;
  copy?: ReturnType<typeof getInfoHubCopy>;
}

export function InfoHubToolbar({
  loading,
  onRefresh,
  autoRefreshMode,
  onToggleAutoRefreshMode,
  copy: providedCopy,
}: InfoHubToolbarProps) {
  const { locale } = useLocale();
  const copy = providedCopy ?? getInfoHubCopy(locale);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border-base bg-white/5 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-2">
        <p className="text-sm font-medium text-white">{copy.toolbarTitle}</p>
        <p className="mt-1 text-xs text-white/45">{copy.toolbarDescription}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant={autoRefreshMode === "realtime" ? "info" : "neutral"}
            size="sm"
            dot={autoRefreshMode === "realtime"}
          >
            {autoRefreshMode === "realtime"
              ? copy.autoRefresh.realtimeBadge
              : copy.autoRefresh.standardBadge}
          </Badge>
          <p className="text-xs text-text-muted">
            {autoRefreshMode === "realtime"
              ? copy.autoRefresh.realtimeDescription
              : copy.autoRefresh.standardDescription}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={autoRefreshMode === "realtime" ? "primary" : "secondary"}
          onClick={onToggleAutoRefreshMode}
        >
          {autoRefreshMode === "realtime"
            ? copy.autoRefresh.switchToStandard
            : copy.autoRefresh.switchToRealtime}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={onRefresh}
        >
          {loading ? copy.refreshing : copy.refresh}
        </Button>
      </div>
    </div>
  );
}
