"use client";

import { useEffect, useState } from "react";
import { PencilLine, X } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Button } from "@/components/ui/Button";
import { pickLocale } from "@/lib/locale";

interface AppPromptModalProps {
  open: boolean;
  title: string;
  message: string;
  placeholder?: string;
  initialValue?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onClose: () => void;
  onConfirm: (value: string) => void | Promise<void>;
}

export function AppPromptModal({
  open,
  title,
  message,
  placeholder,
  initialValue = "",
  confirmLabel,
  cancelLabel,
  onClose,
  onConfirm,
}: AppPromptModalProps) {
  const { locale } = useLocale();
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const resolvedConfirmLabel = confirmLabel ?? pickLocale(locale, {
    ko: "저장",
    en: "Save",
  });
  const resolvedCancelLabel = cancelLabel ?? pickLocale(locale, {
    ko: "취소",
    en: "Cancel",
  });
  const copy = pickLocale(locale, {
    ko: {
      close: "모달 닫기",
      prompt: "입력 필요",
      processing: "처리 중...",
    },
    en: {
      close: "Close modal",
      prompt: "Input Required",
      processing: "Processing...",
    },
  });

  useEffect(() => {
    if (!open) {
      setSubmitting(false);
      return;
    }

    setValue(initialValue);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [initialValue, onClose, open, submitting]);

  if (!open) {
    return null;
  }

  async function handleConfirm() {
    const trimmedValue = value.trim();
    if (!trimmedValue) {
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(trimmedValue);
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
      <div className="relative mx-auto mt-[10vh] w-full max-w-md rounded-[28px] border border-border-base bg-bg-page shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between border-b border-border-base px-6 py-5">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-950/20 px-3 py-1 text-xs text-violet-200">
              <PencilLine className="h-3.5 w-3.5" />
              {copy.prompt}
            </div>
            <h2 className="mt-3 text-lg font-semibold text-white">{title}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            disabled={submitting}
            aria-label={copy.close}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="px-6 py-5">
          <p className="text-sm leading-6 text-text-secondary">{message}</p>
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/40"
          />
          <div className="mt-6 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={submitting}
            >
              {resolvedCancelLabel}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void handleConfirm()}
              disabled={submitting || !value.trim()}
              className="border-violet-500/20 bg-violet-950/30 text-violet-100 hover:bg-violet-950/40"
            >
              {submitting ? copy.processing : resolvedConfirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
