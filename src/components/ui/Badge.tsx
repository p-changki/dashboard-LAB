import { type HTMLAttributes } from "react";

// ── CVA-style variant map (no external cva dependency) ──────────────────────

export type BadgeVariant =
  | "neutral"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "claude"
  | "codex"
  | "gemini";

export type BadgeSize = "sm" | "md" | "lg";

interface BadgeVariantStyle {
  bg: string;
  text: string;
  border: string;
}

const variantStyles: Record<BadgeVariant, BadgeVariantStyle> = {
  neutral: {
    bg:     "rgba(255,255,255,0.06)",
    text:   "var(--color-text-muted)",
    border: "color-mix(in srgb, white 12%, transparent)",
  },
  success: {
    bg:     "var(--color-success-muted)",
    text:   "var(--color-success)",
    border: "color-mix(in srgb, var(--color-success) 30%, transparent)",
  },
  warning: {
    bg:     "var(--color-warning-muted)",
    text:   "var(--color-warning)",
    border: "color-mix(in srgb, var(--color-warning) 30%, transparent)",
  },
  error: {
    bg:     "var(--color-error-muted)",
    text:   "var(--color-error)",
    border: "color-mix(in srgb, var(--color-error) 30%, transparent)",
  },
  info: {
    bg:     "var(--color-info-muted)",
    text:   "var(--color-info)",
    border: "color-mix(in srgb, var(--color-info) 30%, transparent)",
  },
  claude: {
    bg:     "var(--color-accent-claude-muted)",
    text:   "var(--color-accent-claude)",
    border: "color-mix(in srgb, var(--color-accent-claude) 30%, transparent)",
  },
  codex: {
    bg:     "var(--color-accent-codex-muted)",
    text:   "var(--color-accent-codex)",
    border: "color-mix(in srgb, var(--color-accent-codex) 30%, transparent)",
  },
  gemini: {
    bg:     "var(--color-accent-gemini-muted)",
    text:   "var(--color-accent-gemini)",
    border: "color-mix(in srgb, var(--color-accent-gemini) 30%, transparent)",
  },
};

const dotSize: Record<BadgeSize, number> = { sm: 4, md: 5, lg: 6 };

const sizeClasses: Record<BadgeSize, string> = {
  sm: "px-1.5 py-px text-[10px] gap-[3px]",
  md: "px-2 py-0.5 text-[11px] gap-1",
  lg: "px-3 py-1 text-xs gap-1",
};

// ── Badge Props ──────────────────────────────────────────────────────────────

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  /** Show a small dot indicator before the label */
  dot?: boolean;
}

// ── Component ────────────────────────────────────────────────────────────────

// Semantic role defaults per variant (caller can override via role prop).
// success/warning → "status" (polite live region semantic)
// error           → "alert" (assertive semantic)
// others          → no role (purely decorative/informational)
const variantDefaultRole: Partial<Record<BadgeVariant, string>> = {
  success: "status",
  warning: "status",
  error:   "alert",
};

export function Badge({
  variant = "neutral",
  size = "md",
  dot = false,
  children,
  className = "",
  style,
  role,
  ...rest
}: BadgeProps) {
  const { bg, text, border } = variantStyles[variant];

  const baseClasses = [
    "inline-flex items-center font-medium leading-none",
    "border rounded-full whitespace-nowrap shrink-0",
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const inlineStyle: React.CSSProperties = {
    backgroundColor: bg,
    color: text,
    borderColor: border,
    ...style,
  };

  const effectiveRole = role ?? variantDefaultRole[variant];

  return (
    <span className={baseClasses} style={inlineStyle} role={effectiveRole} {...rest}>
      {dot && (
        <span
          aria-hidden="true"
          style={{
            width: dotSize[size],
            height: dotSize[size],
            borderRadius: "50%",
            backgroundColor: "currentColor",
            flexShrink: 0,
          }}
        />
      )}
      {children}
    </span>
  );
}

export default Badge;
