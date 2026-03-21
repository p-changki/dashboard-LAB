"use client";

import { useEffect, useState } from "react";
import { PencilLine, X } from "lucide-react";

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
  confirmLabel = "저장",
  cancelLabel = "취소",
  onClose,
  onConfirm,
}: AppPromptModalProps) {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);

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
        aria-label="모달 닫기"
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
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-950/20 px-3 py-1 text-xs text-violet-200">
              <PencilLine className="h-3.5 w-3.5" />
              입력 필요
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
          <input
            value={value}
            onChange={(event) => setValue(event.target.value)}
            placeholder={placeholder}
            className="mt-4 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-violet-400/40"
          />
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm text-gray-300 transition hover:bg-white/[0.08] hover:text-white disabled:opacity-40"
            >
              {cancelLabel}
            </button>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={submitting || !value.trim()}
              className="rounded-full border border-violet-500/20 bg-violet-950/30 px-4 py-2 text-sm text-violet-100 transition hover:bg-violet-950/40 disabled:opacity-40"
            >
              {submitting ? "처리 중..." : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
