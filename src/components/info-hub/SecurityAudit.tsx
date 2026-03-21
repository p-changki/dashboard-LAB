"use client";

import type { SecurityAuditResponse } from "@/lib/types";

export function SecurityAudit({ data }: { data: SecurityAuditResponse | null }) {
  if (!data) {
    return null;
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/5 p-5">
      <p className="text-sm font-semibold text-white">보안 알림</p>
      <div className="mt-4 space-y-3">
        {data.items.slice(0, 8).map((item) => (
          <div key={item.project} className="rounded-xl border border-white/10 bg-black/20 px-4 py-3">
            <p className="text-sm font-medium text-white">{item.project}</p>
            <p className="mt-1 text-xs text-white/55">
              critical {item.vulnerabilities.critical} · high {item.vulnerabilities.high} · total {item.vulnerabilities.total}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
