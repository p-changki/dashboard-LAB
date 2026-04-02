import { type InputHTMLAttributes } from "react";

// ── CVA-style variant map (no external cva dependency) ──────────────────────

export type InputVariant = "default" | "ghost";
export type InputSize = "sm" | "md" | "lg";

const variantClasses: Record<InputVariant, string> = {
  // Surface bg with token border — standard form fields
  default:
    "border border-[var(--color-border-base)] bg-[var(--color-bg-surface)]"
    + " text-[var(--color-text-primary)] placeholder:text-[var(--color-text-disabled)]"
    + " focus:border-purple-500/40",
  // Glass/overlay bg — floating panels, modals, embedded inputs
  ghost:
    "border border-[var(--color-border-base)] bg-black/15"
    + " text-white placeholder:text-white/30"
    + " focus:border-cyan-300/40",
};

const sizeClasses: Record<InputSize, string> = {
  sm: "rounded-lg  px-3 py-1.5 text-xs",
  md: "rounded-xl  px-4 py-2.5 text-sm",
  lg: "rounded-xl  px-4 py-3   text-sm",
};

// ── Input Props ───────────────────────────────────────────────────────────────

// Omit the native `size` (character-width hint) to expose our design-token size.
export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  variant?: InputVariant;
  size?: InputSize;
  /** Show error border state */
  error?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function Input({
  variant = "default",
  size = "md",
  error = false,
  className = "",
  ...rest
}: InputProps) {
  const classes = [
    "w-full outline-none transition-colors duration-[150ms]",
    "disabled:cursor-not-allowed disabled:opacity-50",
    // Consistent focus-visible ring matching Button
    "focus-visible:ring-2 focus-visible:ring-white/30 focus-visible:ring-offset-1",
    "focus-visible:ring-offset-[var(--color-bg-page)]",
    variantClasses[variant],
    sizeClasses[size],
    error
      ? "border-[var(--color-error)] focus:border-[var(--color-error)]"
      : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <input
      className={classes}
      // aria-invalid is set automatically when error={true}; caller can override.
      aria-invalid={error ? true : undefined}
      {...rest}
    />
  );
}

export default Input;
