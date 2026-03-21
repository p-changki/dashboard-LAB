"use client";

interface NoticeBannerProps {
  tone?: "success" | "info";
  title: string;
  message: string;
}

export function NoticeBanner({ tone = "success", title, message }: NoticeBannerProps) {
  const toneClass = tone === "success"
    ? "border-emerald-500/20 bg-emerald-950/20 text-emerald-100"
    : "border-cyan-500/20 bg-cyan-950/20 text-cyan-100";

  const titleClass = tone === "success" ? "text-emerald-200" : "text-cyan-200";

  return (
    <section className={`rounded-3xl border p-5 ${toneClass}`}>
      <p className={`text-sm font-semibold ${titleClass}`}>{title}</p>
      <p className="mt-2 text-sm leading-6">{message}</p>
    </section>
  );
}
