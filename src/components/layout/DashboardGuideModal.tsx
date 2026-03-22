"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { BookOpenText, Check, CircleHelp, ListChecks, Target, X } from "lucide-react";

import { useLocale } from "@/components/layout/LocaleProvider";
import type { DashboardTabId } from "@/components/layout/TabNav";
import {
  DASHBOARD_TAB_ORDER,
  getDashboardGuideSectionLabels,
  getDashboardGuides,
  getDashboardTabMeta,
} from "@/lib/dashboard-guides";
import { pickLocale } from "@/lib/locale";

type GuideSectionId = "overview" | "features" | "steps" | "scenarios";

interface DashboardGuideModalProps {
  initialTab: DashboardTabId;
  onClose: () => void;
  open: boolean;
}

export function DashboardGuideModal({
  initialTab,
  onClose,
  open,
}: DashboardGuideModalProps) {
  const { locale } = useLocale();
  const [selectedTab, setSelectedTab] = useState<DashboardTabId>(initialTab);
  const [activeSection, setActiveSection] = useState<GuideSectionId>("overview");

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedTab(initialTab);
    setActiveSection("overview");

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [initialTab, onClose, open]);

  const guide = useMemo(() => getDashboardGuides(locale)[selectedTab], [locale, selectedTab]);
  const meta = getDashboardTabMeta(locale)[selectedTab];
  const sectionLabels = getDashboardGuideSectionLabels(locale);
  const copy = pickLocale(locale, {
    ko: {
      close: "사용법 닫기",
      badge: "페이지 사용법",
      title: "대시보드 페이지별 기능과 사용 흐름",
      description:
        "현재 보고 있는 페이지를 기본 선택한 상태로 열립니다. 다른 페이지도 같은 모달에서 바로 비교해 볼 수 있습니다.",
      currentPage: "현재 페이지",
      whatThisPageDoes: "이 페이지에서 하는 일",
      startHere: "먼저 보면 좋은 것",
      features: "핵심 기능",
      featuresDescription: "화면에서 실제로 쓰게 되는 기능을 빠르게 훑을 수 있게 정리했습니다.",
      steps: "빠른 사용 순서",
      stepsDescription: "처음 열었을 때 어디부터 보면 되는지 기준으로 정리했습니다.",
      useWhen: "이럴 때 추천",
      cautions: "주의할 점",
    },
    en: {
      close: "Close guide",
      badge: "Page Guide",
      title: "How each dashboard page fits into the workflow",
      description:
        "The current page is selected by default, and you can compare other pages from the same modal.",
      currentPage: "Current Page",
      whatThisPageDoes: "What This Page Does",
      startHere: "Best Place to Start",
      features: "Key Features",
      featuresDescription: "A quick summary of the features you are most likely to use on this screen.",
      steps: "Quick Steps",
      stepsDescription: "A simple order to follow when using the page for the first time.",
      useWhen: "Recommended When",
      cautions: "Things to Watch",
    },
  });

  const guideSections: Array<{ id: GuideSectionId; label: string }> = [
    { id: "overview", label: sectionLabels.overview },
    { id: "features", label: sectionLabels.features },
    { id: "steps", label: sectionLabels.steps },
    { id: "scenarios", label: sectionLabels.scenarios },
  ];

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-black/65 px-4 py-6 backdrop-blur-sm">
      <button
        type="button"
        aria-label={copy.close}
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative mx-auto flex max-h-[calc(100vh-3rem)] w-full max-w-6xl flex-col overflow-hidden rounded-[30px] border border-white/10 bg-[#131313] shadow-[0_30px_80px_rgba(0,0,0,0.45)]">
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-200">
              <BookOpenText className="h-3.5 w-3.5" />
              {copy.badge}
            </div>
            <h2 className="mt-3 text-xl font-semibold text-white">{copy.title}</h2>
            <p className="mt-2 text-sm leading-6 text-gray-400">
              {copy.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/10 bg-white/5 p-2 text-gray-400 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <div className="space-y-2 overflow-y-auto pr-1">
            {DASHBOARD_TAB_ORDER.map((tabId) => {
              const tabMeta = getDashboardTabMeta(locale)[tabId];
              const isSelected = selectedTab === tabId;

              return (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => {
                    setSelectedTab(tabId);
                    setActiveSection("overview");
                  }}
                  className={`flex w-full items-start justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                    isSelected
                      ? "border-cyan-500/30 bg-cyan-950/20 text-cyan-100"
                      : "border-white/8 bg-white/[0.03] text-gray-400 hover:bg-white/[0.06] hover:text-gray-200"
                  }`}
                >
                  <div>
                    <div className="text-sm font-medium">{tabMeta.title}</div>
                    <p className={`mt-1 text-xs leading-5 ${isSelected ? "text-cyan-100/80" : "text-gray-500"}`}>
                      {tabMeta.description}
                    </p>
                  </div>
                  {isSelected ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : null}
                </button>
              );
            })}
          </div>

          <div className="min-h-0 overflow-y-auto pr-1">
            <div className="rounded-[26px] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full bg-white/8 px-3 py-1 text-xs text-gray-300">
                    <CircleHelp className="h-3.5 w-3.5" />
                    {guide.badge}
                  </div>
                  <h3 className="mt-3 text-2xl font-semibold text-white">{meta.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-400">{guide.summary}</p>
                </div>
                {selectedTab === initialTab ? (
                  <span className="rounded-full border border-cyan-500/20 bg-cyan-950/20 px-3 py-1 text-xs text-cyan-200">
                    {copy.currentPage}
                  </span>
                ) : null}
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {guideSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`rounded-full px-4 py-2 text-xs transition-all ${
                      activeSection === section.id
                        ? "border border-cyan-500/25 bg-cyan-950/25 text-cyan-200"
                        : "border border-white/8 bg-[#1a1a1a] text-gray-400 hover:bg-[#222] hover:text-gray-200"
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            {activeSection === "overview" ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <InfoCard
                  title={copy.whatThisPageDoes}
                  tone="cyan"
                  items={[guide.summary, ...guide.useWhen.slice(0, 2)]}
                />
                <InfoCard
                  title={copy.startHere}
                  tone="violet"
                  items={guide.quickSteps.slice(0, 3)}
                />
              </div>
            ) : null}

            {activeSection === "features" ? (
              <SectionList
                className="mt-4"
                title={copy.features}
                description={copy.featuresDescription}
                icon={<ListChecks className="h-4 w-4" />}
                items={guide.features}
              />
            ) : null}

            {activeSection === "steps" ? (
              <SectionList
                className="mt-4"
                title={copy.steps}
                description={copy.stepsDescription}
                icon={<BookOpenText className="h-4 w-4" />}
                items={guide.quickSteps}
                ordered
              />
            ) : null}

            {activeSection === "scenarios" ? (
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <InfoCard
                  title={copy.useWhen}
                  tone="emerald"
                  items={guide.useWhen}
                  icon={<Target className="h-4 w-4" />}
                />
                <InfoCard
                  title={copy.cautions}
                  tone="amber"
                  items={guide.caution}
                  icon={<CircleHelp className="h-4 w-4" />}
                />
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionList({
  className,
  description,
  icon,
  items,
  ordered = false,
  title,
}: {
  className?: string;
  description: string;
  icon: ReactNode;
  items: string[];
  ordered?: boolean;
  title: string;
}) {
  const ListTag = ordered ? "ol" : "ul";

  return (
    <div className={`rounded-[26px] border border-white/8 bg-white/[0.03] p-5 ${className ?? ""}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        {icon}
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-gray-400">{description}</p>
      <ListTag className={`mt-4 space-y-3 ${ordered ? "list-decimal pl-5" : "list-disc pl-5"} text-sm leading-7 text-gray-200 marker:text-gray-500`}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ListTag>
    </div>
  );
}

function InfoCard({
  icon,
  items,
  title,
  tone,
}: {
  icon?: ReactNode;
  items: string[];
  title: string;
  tone: "amber" | "cyan" | "emerald" | "violet";
}) {
  const tones: Record<"amber" | "cyan" | "emerald" | "violet", string> = {
    cyan: "border-cyan-500/15 bg-cyan-950/10",
    violet: "border-violet-500/15 bg-violet-950/10",
    emerald: "border-emerald-500/15 bg-emerald-950/10",
    amber: "border-amber-500/15 bg-amber-950/10",
  };

  return (
    <div className={`rounded-[26px] border p-5 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-sm font-medium text-white">
        {icon}
        {title}
      </div>
      <ul className="mt-4 list-disc space-y-3 pl-5 text-sm leading-7 text-gray-200 marker:text-gray-500">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
