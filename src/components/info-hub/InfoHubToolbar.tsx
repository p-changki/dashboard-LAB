"use client";

interface InfoHubToolbarProps {
  loading: boolean;
  onRefresh: () => void;
}

export function InfoHubToolbar({ loading, onRefresh }: InfoHubToolbarProps) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-white">Info Hub</p>
        <p className="mt-1 text-xs text-white/45">해외/국내 개발 소식과 내 프로젝트 업데이트를 한 곳에서 봅니다.</p>
      </div>
      <button
        type="button"
        onClick={onRefresh}
        className="rounded-xl border border-white/10 bg-black/20 px-4 py-2 text-sm text-white/80 hover:bg-black/30"
      >
        {loading ? "새로고침 중" : "새로고침"}
      </button>
    </div>
  );
}
