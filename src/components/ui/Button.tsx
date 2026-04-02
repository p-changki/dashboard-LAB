import { type ButtonHTMLAttributes } from "react";

// ── CVA-style variant map (no external cva dependency) ──────────────────────

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "destructive";

export type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantClasses: Record<ButtonVariant, string> = {
  // White fill — primary action
  primary:
    "bg-white text-black hover:bg-white/90 disabled:bg-white/60",
  // Subtle fill with border — secondary action
  secondary:
    "border border-[var(--color-border-base)] bg-white/[0.06] text-[var(--color-text-primary)] hover:bg-white/10 disabled:opacity-50",
  // No fill — sidebar nav, toolbar
  ghost:
    "bg-transparent text-[var(--color-text-secondary)] hover:bg-white/[0.06] hover:text-[var(--color-text-primary)] disabled:opacity-50",
  // Border only
  outline:
    "border border-[var(--color-border-hover)] bg-transparent text-[var(--color-text-primary)] hover:bg-white/[0.06] disabled:opacity-50",
  // Destructive — error semantic tokens (border/hover use error color at 30%/25% opacity)
  destructive:
    "border border-[color-mix(in_srgb,var(--color-error)_30%,transparent)] bg-[var(--color-error-muted)] text-[var(--color-error)] hover:bg-[color-mix(in_srgb,var(--color-error)_25%,transparent)] disabled:opacity-50",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm:   "h-7 rounded-md px-2.5 text-[11px] gap-1.5",
  md:   "h-8 rounded-md px-3 text-[13px] gap-1.5",
  lg:   "h-10 rounded-lg px-4 text-[14px] gap-2",
  icon: "h-8 w-8 rounded-md",
};

// ── Button Props ─────────────────────────────────────────────────────────────

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

// ── Component ────────────────────────────────────────────────────────────────

export function Button({
  variant = "secondary",
  size = "md",
  children,
  className = "",
  disabled,
  ...rest
}: ButtonProps) {
  const classes = [
    // base
    "inline-flex items-center justify-center font-medium",
    "whitespace-nowrap shrink-0",
    "transition-colors duration-[150ms]",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30",
    "focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-bg-page)]",
    "disabled:pointer-events-none cursor-pointer",
    variantClasses[variant],
    sizeClasses[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={classes}
      disabled={disabled}
      // aria-disabled mirrors the native disabled state for AT that
      // inspect ARIA attributes directly (e.g. some mobile screen readers).
      aria-disabled={disabled ?? undefined}
      {...rest}
    >
      {children}
    </button>
  );
}

export default Button;
