"use client";

interface CsMessageInputProps {
  projectName: string | null;
  channelLabel: string;
  toneLabel: string;
  customerMessage: string;
  additionalContext: string;
  includeAnalysis: boolean;
  warning: string | null;
  loading: boolean;
  canSubmit: boolean;
  onCustomerMessageChange: (value: string) => void;
  onAdditionalContextChange: (value: string) => void;
  onIncludeAnalysisChange: (value: boolean) => void;
  onClear: () => void;
  onSubmit: () => void;
}

export function CsMessageInput({
  projectName,
  channelLabel,
  toneLabel,
  customerMessage,
  additionalContext,
  includeAnalysis,
  warning,
  loading,
  canSubmit,
  onCustomerMessageChange,
  onAdditionalContextChange,
  onIncludeAnalysisChange,
  onClear,
  onSubmit,
}: CsMessageInputProps) {
  return (
    <section className="panel p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.24em] text-[var(--color-muted)]">
            고객 메시지
          </p>
          <p className="mt-2 text-sm text-[var(--color-text-soft)]">
            {projectName ? `${projectName} 기준` : "프로젝트 미선택"} · {channelLabel} · {toneLabel} 설정으로 고객 응답을 생성합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={loading}
          className="rounded-full border border-white/10 bg-white/6 px-4 py-2 text-xs text-white/75 transition hover:bg-white/10 disabled:opacity-40"
        >
          입력 초기화
        </button>
      </div>
      {warning ? (
        <div className="mt-4 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          {warning}
        </div>
      ) : null}
      <textarea
        value={customerMessage}
        onChange={(event) => onCustomerMessageChange(event.target.value)}
        placeholder="고객이 보낸 메시지를 여기에 붙여 넣으세요."
        className="mt-4 min-h-40 w-full rounded-3xl border border-white/10 bg-black/15 px-4 py-4 text-sm leading-7 text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
      />
      <div className="mt-2 text-right text-xs text-[var(--color-muted)]">
        {customerMessage.trim().length} / 2000
      </div>
      <input
        value={additionalContext}
        onChange={(event) => onAdditionalContextChange(event.target.value)}
        placeholder="추가 맥락이 있으면 입력하세요. 예: 결제 이력 확인 완료"
        className="mt-4 w-full rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white outline-none placeholder:text-white/30 focus:border-cyan-300/40"
      />
      <div className="mt-2 text-right text-xs text-[var(--color-muted)]">
        {additionalContext.trim().length} / 1000
      </div>
      <label className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-sm text-white/80">
        <div>
          <p className="font-medium text-white">내부 분석 함께 생성</p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            켜면 답변 생성과 동시에 내부 분석도 같이 실행합니다. 끄면 필요할 때만 별도로 생성합니다.
          </p>
        </div>
        <input
          type="checkbox"
          checked={includeAnalysis}
          onChange={(event) => onIncludeAnalysisChange(event.target.checked)}
          className="h-4 w-4 rounded border-white/20 bg-black/20 accent-cyan-300"
        />
      </label>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--color-muted)]">
          응답 생성 후 히스토리에도 바로 저장됩니다.
        </p>
        <button
          type="button"
          onClick={onSubmit}
          disabled={loading || !canSubmit}
          className="rounded-full bg-cyan-300 px-5 py-2 text-sm font-medium text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? (includeAnalysis ? "응답·분석 생성 중" : "응답 생성 중") : "응답 생성"}
        </button>
      </div>
    </section>
  );
}
