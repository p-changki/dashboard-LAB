"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { X } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface Toast {
  id: string;
  variant: ToastVariant;
  message: string;
  /** Duration in ms. Defaults to 3000. Pass 0 to disable auto-dismiss. */
  duration?: number;
}

interface ToastContextValue {
  show: (message: string, variant?: ToastVariant, duration?: number) => void;
}

// ── Variant styles ─────────────────────────────────────────────────────────

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border-[var(--color-success)]/30 bg-[var(--color-success-muted)] text-[var(--color-success)]",
  error:
    "border-[var(--color-error)]/30 bg-[var(--color-error-muted)] text-[var(--color-error)]",
  warning:
    "border-[var(--color-warning)]/30 bg-[var(--color-warning-muted)] text-[var(--color-warning)]",
  info:
    "border-[var(--color-info)]/30 bg-[var(--color-info-muted)] text-[var(--color-info)]",
};

const ariaLive: Record<ToastVariant, "polite" | "assertive"> = {
  success: "polite",
  warning: "polite",
  info: "polite",
  error: "assertive",
};

// ── Context ────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = "info", duration = 3000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, variant, message, duration }]);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ── Hook ───────────────────────────────────────────────────────────────────

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used inside <ToastProvider>");
  }
  return ctx;
}

// ── Container ──────────────────────────────────────────────────────────────

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2"
      role="region"
      aria-label="알림"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── Item ───────────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const duration = toast.duration ?? 3000;

  useEffect(() => {
    if (duration === 0) return;
    timerRef.current = setTimeout(() => onDismiss(toast.id), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [toast.id, duration, onDismiss]);

  return (
    <div
      role="status"
      aria-live={ariaLive[toast.variant]}
      className={[
        "flex min-w-[260px] max-w-sm items-start justify-between gap-3 rounded-2xl border px-4 py-3 shadow-lg",
        variantStyles[toast.variant],
      ].join(" ")}
    >
      <p className="text-sm leading-6">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="알림 닫기"
        className="mt-0.5 shrink-0 opacity-70 transition hover:opacity-100"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
