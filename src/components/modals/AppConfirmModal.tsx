"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { pickLocale } from "@/lib/locale";

interface AppConfirmModalProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: "default" | "danger";
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
}

export function AppConfirmModal({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  tone = "default",
  onClose,
  onConfirm,
}: AppConfirmModalProps) {
  const { locale } = useLocale();
  const [submitting, setSubmitting] = useState(false);
  const resolvedConfirmLabel = confirmLabel ?? pickLocale(locale, {
    ko: "확인",
    en: "Confirm",
  });
  const resolvedCancelLabel = cancelLabel ?? pickLocale(locale, {
    ko: "취소",
    en: "Cancel",
  });
  const copy = pickLocale(locale, {
    ko: {
      close: "모달 닫기",
      needConfirm: "확인 필요",
      processing: "처리 중...",
    },
    en: {
      close: "Close modal",
      needConfirm: "Needs Confirmation",
      processing: "Processing...",
    },
  });

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, submitting]);

  if (!open) {
    return null;
  }

  const confirmClassName = tone === "danger"
    ? "border-rose-500/20 bg-rose-950/30 text-rose-100 hover:bg-rose-950/40"
    : "border-cyan-500/20 bg-cyan-950/30 text-cyan-100 hover:bg-cyan-950/40";

  async function handleConfirm() {
    try {
      setSubmitting(true);
      await onConfirm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[140] bg-black/70 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label={copy.close}
        className="absolute inset-0 cursor-default"
        onClick={() => {
          if (!submitting) {
            onClose();
          }
        }}
      />
      <div className="relative mx-auto mt-[10vh] w-full max-w-md rounded-[28px] border border-white/10 bg-[#131313] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div className="min-w-0">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              tone === "danger"
                ? "border-rose-500/20 bg-rose-950/20 text-rose-200"
                : "border-cyan-500/20 bg-cyan-950/20 text-cyan-200"
            }`}>
              <AlertTriangle className="h-3.5 w-3.5" />
              {copy.needConfirm}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-gray-300">{message}</p>
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
            >
              {resolvedCancelLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting}
              className={`rounded-full border px-4 py-2 text-sm transition disabled:opacity-40 ${confirmClassName}`}
            >
              {submitting ? copy.processing : resolvedConfirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
