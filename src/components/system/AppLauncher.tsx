"use client";

import type { InstalledApp } from "@/lib/types";

interface AppLauncherProps {
  apps: InstalledApp[];
  onLaunch: (appPath: string) => void;
}

export function AppLauncher({ apps, onLaunch }: AppLauncherProps) {
  const grouped = apps.reduce<Record<string, InstalledApp[]>>(
    (acc, app) => ({ ...acc, [app.category]: [...(acc[app.category] ?? []), app] }),
    {},
  );

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-lg font-semibold text-gray-100">App Launcher</p>
      <div className="mt-4 space-y-4">
        {Object.entries(grouped).map(([category, categoryApps]) => (
          <div key={category}>
            <p className="mb-2 text-sm font-medium text-gray-400">{category}</p>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {categoryApps.map((app) => (
                <button
                  key={app.path}
                  type="button"
                  onClick={() => onLaunch(app.path)}
                  className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-900/70 px-3 py-3 text-left hover:bg-gray-800"
                >
                  <span className="text-sm text-white">{app.name}</span>
                  <span className={app.isRunning ? "text-green-400" : "text-gray-500"}>
                    {app.isRunning ? "●" : "○"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
