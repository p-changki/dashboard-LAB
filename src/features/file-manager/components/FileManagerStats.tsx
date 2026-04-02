import type { FileManagerResponse } from "@/lib/types";

interface FileManagerStatsProps {
  data: FileManagerResponse;
}

export function FileManagerStats({ data }: FileManagerStatsProps) {
  return (
    <section className="grid gap-4 md:grid-cols-3">
      <StatCard
        title="Desktop"
        value={`${data.desktop.totalFiles}파일 · ${data.desktop.totalFolders}폴더`}
        meta={data.desktop.totalSize}
      />
      <StatCard
        title="Downloads"
        value={`${data.downloads.totalFiles}파일 · ${data.downloads.totalFolders}폴더`}
        meta={data.downloads.totalSize}
      />
      <StatCard
        title="정리 가능"
        value={`${data.stats.totalCleanable}개`}
        meta={data.stats.totalCleanableSize}
      />
    </section>
  );
}

function StatCard({ title, value, meta }: { title: string; value: string; meta: string }) {
  return (
    <article className="rounded-2xl border border-gray-800 bg-gray-800/40 p-5">
      <p className="text-sm text-text-muted">{title}</p>
      <p className="mt-3 text-xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-text-muted">{meta}</p>
    </article>
  );
}
