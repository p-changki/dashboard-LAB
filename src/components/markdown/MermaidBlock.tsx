"use client";

import { useEffect, useId, useState } from "react";

interface MermaidBlockProps {
  chart: string;
}

let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;

async function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((module) => {
      module.default.initialize({
        startOnLoad: false,
        securityLevel: "strict",
        theme: "dark",
      });

      return module.default;
    });
  }

  return mermaidPromise;
}

export function MermaidBlock({ chart }: MermaidBlockProps) {
  const id = useId().replace(/:/g, "-");
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function renderChart() {
      try {
        const mermaid = await getMermaid();
        const { svg: renderedSvg } = await mermaid.render(`mermaid-${id}`, chart);

        if (!active) {
          return;
        }

        setSvg(renderedSvg);
        setError(null);
      } catch (err) {
        if (!active) {
          return;
        }

        setSvg(null);
        setError(err instanceof Error ? err.message : "Mermaid 렌더링 실패");
      }
    }

    void renderChart();

    return () => {
      active = false;
    };
  }, [chart, id]);

  if (error) {
    return (
      <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-4 text-sm text-amber-200">
        <p className="font-medium">시퀀스 다이어그램 렌더링 실패</p>
        <p className="mt-1 text-xs text-amber-100/80">{error}</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-bg-page p-3 text-xs text-text-secondary">
          <code>{chart}</code>
        </pre>
      </div>
    );
  }

  if (!svg) {
    return (
      <div className="rounded-xl border border-border-base bg-bg-surface p-6 text-center text-sm text-text-muted">
        시퀀스 다이어그램 렌더링 중...
      </div>
    );
  }

  return (
    <div
      className="overflow-x-auto rounded-xl border border-border-base bg-bg-surface p-4 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
