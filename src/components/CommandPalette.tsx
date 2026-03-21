import { CopyButton } from "@/components/CopyButton";
import { PinButton } from "@/components/PinButton";

interface QuickCommand {
  label: string;
  value: string;
  description: string;
}

interface CommandPaletteProps {
  commands: QuickCommand[];
}

export function CommandPalette({ commands }: CommandPaletteProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {commands.map((command) => (
        <article key={`${command.label}-${command.value}`} className="panel p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-white">{command.label}</p>
              <p className="mt-2 text-sm leading-6 text-[var(--color-text-soft)]">
                {command.description}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <PinButton
                item={{
                  id: `command:${command.label}`,
                  type: "command",
                  name: command.label,
                  tab: "home",
                  action: command.value,
                  actionMode: "copy",
                }}
              />
              <CopyButton
                value={command.value}
                recentItem={{
                  id: `command:${command.label}`,
                  name: command.label,
                  type: "command",
                }}
              />
            </div>
          </div>
          <code className="mt-5 block break-all rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-xs text-cyan-100">
            {command.value}
          </code>
        </article>
      ))}
    </div>
  );
}
