"use client";

import { CircleHelp, FileAudio, FileText, Phone, Upload } from "lucide-react";

import { EmptyStateCard } from "@/components/ui/EmptyStateCard";
import { NoticeBanner } from "@/components/ui/NoticeBanner";
import {
  CALL_CUSTOMER_IMPACT_LABELS,
  CALL_CUSTOMER_IMPACTS,
  CALL_INPUT_KIND_LABELS,
  CALL_INPUT_KINDS,
  CALL_REPRODUCIBILITY_LABELS,
  CALL_REPRODUCIBILITY_STATES,
  CALL_SEVERITIES,
  CALL_SEVERITY_LABELS,
  CALL_URGENCY_LABELS,
  CALL_URGENCY_LEVELS,
  type CallCustomerImpact,
  type CallInputKind,
  type CallReproducibility,
  type CallSeverity,
  type CallUrgency,
} from "@/lib/call-to-prd/intake-config";
import {
  CALL_DOC_DEFINITIONS,
  CALL_DOC_PRESET_DEFINITIONS,
  type CallDocPreset,
  type CallDocType,
} from "@/lib/call-to-prd/document-config";
import type { ProjectSummary } from "@/lib/types";
import type {
  CallGenerationMode,
  CallDocTemplateSet,
  CallRecord,
  SavedCallBundleIndexItem,
} from "@/lib/types/call-to-prd";
import {
  GENERATION_MODE_OPTIONS,
  buildStatusLabel,
  getGenerationModeLabel,
} from "@/features/call-to-prd/components/CallToPrdMarkdown";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type InputMode = "file" | "text";

export interface CallToPrdIntakeProps {
  isCoreMode: boolean;
  feedbackMessage: string;

  // Input mode
  mode: InputMode;
  setMode: (mode: InputMode) => void;
  file: File | null;
  setFile: (file: File | null) => void;
  pdfFile: File | null;
  setPdfFile: (file: File | null) => void;
  directText: string;
  setDirectText: (text: string) => void;

  // Project
  projectPath: string;
  projectName: string;
  setProjectName: (name: string) => void;
  customerName: string;
  setCustomerName: (name: string) => void;
  additionalContext: string;
  setAdditionalContext: (context: string) => void;
  projects: ProjectSummary[];
  currentProjectPath: string;
  selectedProject: ProjectSummary | null;
  handleProjectSelect: (path: string) => void;

  // Input structuring
  inputKind: CallInputKind;
  setInputKind: (kind: CallInputKind) => void;
  severity: CallSeverity;
  setSeverity: (severity: CallSeverity) => void;
  customerImpact: CallCustomerImpact;
  setCustomerImpact: (impact: CallCustomerImpact) => void;
  urgency: CallUrgency;
  setUrgency: (urgency: CallUrgency) => void;
  reproducibility: CallReproducibility;
  setReproducibility: (reproducibility: CallReproducibility) => void;
  currentWorkaround: string;
  setCurrentWorkaround: (workaround: string) => void;
  separateExternalDocs: boolean;
  setSeparateExternalDocs: (value: boolean) => void;

  // Change baseline
  needsChangeBaseline: boolean;
  baselineEntryName: string;
  setBaselineEntryName: (name: string) => void;
  savedBundles: SavedCallBundleIndexItem[];

  // Queue
  activeQueue: CallRecord[];
  recentQueue: CallRecord[];
  setSelectedHistory: (record: CallRecord | null) => void;
  setSelectedSaved: (saved: string | null) => void;
  handleRetryRecord: (record: CallRecord) => void;
  handleDeleteHistoryRecord: (id: string) => void;

  // Template sets
  availableTemplateSets: CallDocTemplateSet[];
  applyTemplateSet: (set: CallDocTemplateSet) => void;
  handleSaveTemplateSet: () => void;
  handleDeleteTemplateSet: (id: string) => void;

  // Generation config
  generationMode: CallGenerationMode;
  setGenerationMode: (mode: CallGenerationMode) => void;
  generationPreset: CallDocPreset;
  applyPreset: (preset: CallDocPreset) => void;
  selectedDocTypes: CallDocType[];
  toggleDocType: (docType: CallDocType) => void;
  setGuideOpen: (open: boolean) => void;

  // Submit
  handleSubmit: () => void;

  // Empty state
  displayRecord: CallRecord | null;
  history: CallRecord[];
  savedTotalCount: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CallToPrdIntake(props: CallToPrdIntakeProps) {
  const {
    isCoreMode,
    feedbackMessage,
    mode,
    setMode,
    file,
    setFile,
    pdfFile,
    setPdfFile,
    directText,
    setDirectText,
    projectPath,
    projectName,
    setProjectName,
    customerName,
    setCustomerName,
    additionalContext,
    setAdditionalContext,
    projects,
    currentProjectPath,
    selectedProject,
    handleProjectSelect,
    inputKind,
    setInputKind,
    severity,
    setSeverity,
    customerImpact,
    setCustomerImpact,
    urgency,
    setUrgency,
    reproducibility,
    setReproducibility,
    currentWorkaround,
    setCurrentWorkaround,
    separateExternalDocs,
    setSeparateExternalDocs,
    needsChangeBaseline,
    baselineEntryName,
    setBaselineEntryName,
    savedBundles,
    activeQueue,
    recentQueue,
    setSelectedHistory,
    setSelectedSaved,
    handleRetryRecord,
    handleDeleteHistoryRecord,
    availableTemplateSets,
    applyTemplateSet,
    handleSaveTemplateSet,
    handleDeleteTemplateSet,
    generationMode,
    setGenerationMode,
    generationPreset,
    applyPreset,
    selectedDocTypes,
    toggleDocType,
    setGuideOpen,
    handleSubmit,
    displayRecord,
    history,
    savedTotalCount,
  } = props;

  return (
    <div className="space-y-5">
      {isCoreMode ? (
        <NoticeBanner
          tone="info"
          title="간단 모드 안내"
          message="처음에는 텍스트 직접 입력으로 시작하는 편이 가장 단순합니다. 회의 메모나 고객 이슈 설명을 붙여넣고 프로젝트만 선택한 뒤 문서 생성 시작을 누르면 됩니다."
        />
      ) : null}
      {feedbackMessage ? (
        <NoticeBanner
          title="반영되었습니다"
          message={feedbackMessage}
        />
      ) : null}

      {/* 입력 모드 토글 */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setMode("file")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${mode === "file" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          <FileAudio className="mr-2 inline h-4 w-4" />녹음 파일
        </button>
        <button type="button" onClick={() => setMode("text")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${mode === "text" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-[#1e1e1e] text-gray-400 border border-white/8"}`}>
          내용 직접 입력
        </button>
      </div>

      {/* 파일 업로드 또는 텍스트 입력 */}
      {mode === "file" ? (
        <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-white/10 bg-[#1e1e1e] p-10 text-center transition-all duration-[150ms] hover:border-purple-500/30 hover:bg-[#242424]">
          <Upload className="h-8 w-8 text-gray-500" />
          <p className="text-sm text-gray-400">{file ? file.name : "녹음 파일을 드래그하거나 클릭 (.m4a .mp3 .wav .webm, 최대 50MB)"}</p>
          <input type="file" accept=".m4a,.mp3,.wav,.webm" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      ) : (
        <textarea
          value={directText}
          onChange={(e) => setDirectText(e.target.value)}
          placeholder="고객 불만, 회의 메모, 통화 내용, 운영 이슈를 여기에 붙여넣기..."
          className="w-full rounded-2xl border border-white/8 bg-[#1e1e1e] p-5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none"
          rows={8}
        />
      )}

      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-white/10 bg-[#1e1e1e] p-6 text-center transition-all duration-[150ms] hover:border-purple-500/30 hover:bg-[#242424]">
        <FileText className="h-6 w-6 text-gray-500" />
        <p className="text-sm text-gray-400">
          {pdfFile ? `첨부 PDF: ${pdfFile.name}` : "참고 PDF 첨부 (워크북/양식, 선택, 최대 20MB)"}
        </p>
        <input type="file" accept=".pdf" className="hidden" onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)} />
      </label>

      {/* 메타 정보 */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <select
          value={projectPath}
          onChange={(event) => handleProjectSelect(event.target.value)}
          className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
        >
          <option value="">로컬 프로젝트 선택 (선택)</option>
          {projects.map((project) => (
            <option key={project.path} value={project.path}>
              {project.path === currentProjectPath ? `${project.name} (현재 작업중)` : project.name}
            </option>
          ))}
        </select>
        <input value={projectName} onChange={(e) => setProjectName(e.target.value)} placeholder="프로젝트명 (선택)" className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
        <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="고객명 (선택)" className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
        <input value={additionalContext} onChange={(e) => setAdditionalContext(e.target.value)} placeholder="추가 맥락 (선택)" className="rounded-xl border border-white/8 bg-[#1e1e1e] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none" />
      </div>

      <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[#f0f0f0]">입력 구조화</h3>
            <p className="mt-1 text-xs leading-6 text-gray-500">
              입력 유형과 문제 강도를 같이 주면 문제정의서, PRD, 고객 공유 문서의 톤과 우선순위 판단이 더 안정적으로 나옵니다.
            </p>
          </div>
          <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-[11px] text-cyan-200">
            {CALL_INPUT_KIND_LABELS[inputKind]}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2">
            <span className="text-xs text-gray-500">입력 유형</span>
            <select
              value={inputKind}
              onChange={(event) => setInputKind(event.target.value as CallInputKind)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_INPUT_KINDS.map((value) => (
                <option key={value} value={value}>{CALL_INPUT_KIND_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">심각도</span>
            <select
              value={severity}
              onChange={(event) => setSeverity(event.target.value as CallSeverity)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_SEVERITIES.map((value) => (
                <option key={value} value={value}>{CALL_SEVERITY_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">영향 범위</span>
            <select
              value={customerImpact}
              onChange={(event) => setCustomerImpact(event.target.value as CallCustomerImpact)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_CUSTOMER_IMPACTS.map((value) => (
                <option key={value} value={value}>{CALL_CUSTOMER_IMPACT_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">긴급도</span>
            <select
              value={urgency}
              onChange={(event) => setUrgency(event.target.value as CallUrgency)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_URGENCY_LEVELS.map((value) => (
                <option key={value} value={value}>{CALL_URGENCY_LABELS[value]}</option>
              ))}
            </select>
          </label>

          <label className="space-y-2">
            <span className="text-xs text-gray-500">재현 상태</span>
            <select
              value={reproducibility}
              onChange={(event) => setReproducibility(event.target.value as CallReproducibility)}
              className="w-full rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              {CALL_REPRODUCIBILITY_STATES.map((value) => (
                <option key={value} value={value}>{CALL_REPRODUCIBILITY_LABELS[value]}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
          <input
            value={currentWorkaround}
            onChange={(event) => setCurrentWorkaround(event.target.value)}
            placeholder="현재 우회책 또는 임시 대응이 있으면 입력"
            className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] placeholder:text-gray-600 focus:border-purple-500/40 focus:outline-none"
          />

          <label className="flex items-center justify-between gap-3 rounded-xl border border-white/8 bg-[#151515] px-4 py-3 text-sm text-gray-300">
            <div>
              <p className="font-medium text-[#f0f0f0]">고객 공유 문서 분리</p>
              <p className="mt-1 text-xs leading-5 text-gray-500">켜면 고객 전달용 문서에서 내부 메모와 원인 가설을 제외합니다.</p>
            </div>
            <input
              type="checkbox"
              checked={separateExternalDocs}
              onChange={(event) => setSeparateExternalDocs(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-black/20 accent-purple-400"
            />
          </label>
        </div>
      </div>

      {selectedProject && (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-[#f0f0f0]">{selectedProject.name}</span>
            <span className="rounded-full bg-purple-900/25 px-2 py-0.5 text-[11px] text-purple-200">{selectedProject.type}</span>
            {selectedProject.techStack.slice(0, 4).map((stack) => (
              <span key={stack} className="rounded-full bg-white/8 px-2 py-0.5 text-[11px] text-gray-300">
                {stack}
              </span>
            ))}
          </div>
          <p className="mt-2 text-xs text-gray-500">{selectedProject.path}</p>
          {selectedProject.path === currentProjectPath && (
            <p className="mt-2 text-xs font-medium text-purple-200">현재 이 워크스페이스를 기준으로 문서를 생성합니다.</p>
          )}
          <p className="mt-2 text-xs leading-6 text-gray-400">
            선택한 프로젝트의 `package.json`, `README`, `docs`, git 상태를 요약해서 문서 생성 프롬프트에 함께 반영합니다.
          </p>
        </div>
      )}

      {needsChangeBaseline ? (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">변경 비교 기준 문서</h3>
              <p className="mt-1 text-xs leading-6 text-gray-500">
                선택하면 해당 저장 문서를 기준선으로 비교하고, 비워두면 같은 프로젝트의 최신 저장 문서를 자동 선택합니다.
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={baselineEntryName}
              onChange={(event) => setBaselineEntryName(event.target.value)}
              className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2.5 text-sm text-[#f0f0f0] focus:border-purple-500/40 focus:outline-none"
            >
              <option value="">자동 선택 (같은 프로젝트 최신 저장 문서)</option>
              {savedBundles.map((bundle) => (
                <option key={bundle.entryName} value={bundle.entryName}>
                  {bundle.title} · {bundle.createdAt.slice(0, 10)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setBaselineEntryName("")}
              className="rounded-xl border border-white/8 bg-[#151515] px-4 py-2 text-xs text-gray-300 transition hover:bg-[#242424]"
            >
              자동 기준선 사용
            </button>
          </div>
        </div>
      ) : null}

      {(activeQueue.length > 0 || recentQueue.length > 0) && (
        <div className="rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-[#f0f0f0]">작업 큐</h3>
              <p className="mt-1 text-xs leading-6 text-gray-500">
                현재 생성 중인 작업과 최근 완료 작업을 한 화면에서 확인합니다.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-purple-900/20 px-2 py-0.5 text-purple-200">진행중 {activeQueue.length}</span>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">최근 완료 {recentQueue.length}</span>
            </div>
          </div>

          <div className="mt-4 grid gap-4 xl:grid-cols-2">
            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">In Progress</p>
              {activeQueue.length > 0 ? activeQueue.map((record) => (
                <button
                  key={record.id}
                  type="button"
                  onClick={() => {
                    setSelectedHistory(record);
                    setSelectedSaved(null);
                  }}
                  className="w-full rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 text-left transition hover:bg-[#202020]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-white">{record.projectName ?? record.fileName}</span>
                    <span className="text-xs text-purple-300">{record.status}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {record.docGenerationProgress ?? buildStatusLabel(record.status)}
                  </p>
                </button>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
                  진행 중인 작업이 없습니다.
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Recent</p>
              {recentQueue.length > 0 ? recentQueue.map((record) => (
                <div
                  key={record.id}
                  className="w-full rounded-2xl border border-white/8 bg-[#151515] px-4 py-3 transition hover:bg-[#202020]"
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedHistory(record);
                        setSelectedSaved(null);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-white">{record.projectName ?? record.fileName}</span>
                        <span className={`text-xs ${record.status === "completed" ? "text-emerald-300" : "text-rose-300"}`}>
                          {record.status}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500">{record.callDate} · {record.generatedDocs.length || record.selectedDocTypes.length}개 문서</p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400">
                        <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
                          {getGenerationModeLabel(record.generationMode)}
                        </span>
                      </div>
                    </button>
                    <div className="flex items-center gap-2">
                      {record.status === "failed" ? (
                        <button
                          type="button"
                          onClick={() => handleRetryRecord(record)}
                          className="rounded-full border border-cyan-500/20 bg-cyan-950/20 px-2.5 py-1 text-[11px] text-cyan-200 transition hover:bg-cyan-950/30"
                        >
                          재시도
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void handleDeleteHistoryRecord(record.id)}
                        className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
                  최근 완료 작업이 없습니다.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[#f0f0f0]">프로젝트 템플릿 세트</h3>
            <p className="text-xs leading-6 text-gray-500">
              현재 문서 조합을 프로젝트별 템플릿으로 저장해 반복 요청에 재사용할 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveTemplateSet}
            className="rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            현재 구성 저장
          </button>
        </div>

        {availableTemplateSets.length > 0 ? (
          <div className="grid gap-3 xl:grid-cols-2">
            {availableTemplateSets.map((templateSet) => (
              <div key={templateSet.id} className="rounded-2xl border border-white/8 bg-[#151515] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-white">{templateSet.name}</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {templateSet.projectName ?? "모든 프로젝트"} · {getGenerationModeLabel(templateSet.generationMode)} · {templateSet.generationPreset === "custom" ? "커스텀" : CALL_DOC_PRESET_DEFINITIONS[templateSet.generationPreset].label}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteTemplateSet(templateSet.id)}
                    className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gray-400 transition hover:bg-white/[0.08] hover:text-white"
                  >
                    삭제
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {templateSet.selectedDocTypes.map((docType) => (
                    <span key={docType} className="rounded-full bg-white/8 px-2.5 py-1 text-[11px] text-gray-300">
                      {CALL_DOC_DEFINITIONS[docType].shortLabel}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex justify-end">
                  <button
                    type="button"
                    onClick={() => applyTemplateSet(templateSet)}
                    className="rounded-full border border-purple-500/20 bg-purple-900/20 px-4 py-2 text-xs font-medium text-purple-200 transition hover:bg-purple-900/30"
                  >
                    이 구성 적용
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/8 px-4 py-4 text-sm text-gray-500">
            저장된 템플릿 세트가 없습니다. 자주 쓰는 문서 구성을 저장해 두면 운영 기능 추가나 AI 검수 요청에 바로 재사용할 수 있습니다.
          </div>
        )}
      </div>

      <div className="space-y-4 rounded-2xl border border-white/8 bg-[#1e1e1e] p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h3 className="text-sm font-semibold text-[#f0f0f0]">문서 생성 구성</h3>
            <p className="text-xs leading-6 text-gray-500">
              내부는 문서별로 따로 생성하고, 여기서는 프리셋으로 한 번에 선택하거나 필요한 문서만 커스텀으로 고를 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setGuideOpen(true)}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs font-medium text-gray-300 transition-colors hover:bg-white/[0.08] hover:text-white"
          >
            <CircleHelp className="h-4 w-4" />
            선택 가이드 보기
          </button>
        </div>

        <div className="grid gap-3 xl:grid-cols-3">
          {GENERATION_MODE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGenerationMode(option.value)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                generationMode === option.value
                  ? "border-cyan-500/30 bg-cyan-950/20"
                  : "border-white/8 bg-[#151515] hover:bg-[#202020]"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-[#f0f0f0]">{option.label}</span>
                <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                  generationMode === option.value ? "bg-cyan-900/30 text-cyan-200" : "bg-white/8 text-gray-500"
                }`}>
                  {generationMode === option.value ? "사용 중" : "선택 가능"}
                </span>
              </div>
              <p className="mt-2 text-xs leading-6 text-gray-500">{option.description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-3 xl:grid-cols-5">
          {(
            [
              ...Object.entries(CALL_DOC_PRESET_DEFINITIONS).map(([preset, definition]) => ({
                preset: preset as Exclude<CallDocPreset, "custom">,
                label: definition.label,
                description: definition.description,
              })),
              {
                preset: "custom" as const,
                label: "커스텀",
                description: "아래 체크박스로 필요한 문서만 선택",
              },
            ] satisfies Array<{ preset: CallDocPreset; label: string; description: string }>
          ).map((preset) => (
            <button
              key={preset.preset}
              type="button"
              onClick={() => applyPreset(preset.preset)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all duration-[150ms] ${
                generationPreset === preset.preset
                  ? "border-purple-500/30 bg-purple-950/20"
                  : "border-white/8 bg-[#151515] hover:bg-[#202020]"
              }`}
            >
              <div className="text-sm font-medium text-[#f0f0f0]">{preset.label}</div>
              <p className="mt-2 text-xs leading-6 text-gray-500">{preset.description}</p>
            </button>
          ))}
        </div>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {Object.values(CALL_DOC_DEFINITIONS).map((doc) => {
            const checked = selectedDocTypes.includes(doc.type);
            const locked = doc.type === "prd";

            return (
              <button
                key={doc.type}
                type="button"
                onClick={() => toggleDocType(doc.type)}
                className={`rounded-2xl border px-4 py-3 text-left transition-all duration-[150ms] ${
                  checked
                    ? "border-purple-500/30 bg-purple-950/20"
                    : "border-white/8 bg-[#151515] hover:bg-[#202020]"
                } ${locked ? "cursor-default" : ""}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-[#f0f0f0]">{doc.label}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] ${
                    checked ? "bg-purple-900/30 text-purple-300" : "bg-white/8 text-gray-500"
                  }`}>
                    {locked ? "필수" : checked ? "선택됨" : "선택 가능"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-6 text-gray-500">{doc.description}</p>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
          <span>선택 문서 {selectedDocTypes.length}개</span>
          <span className="rounded-full bg-cyan-900/20 px-2 py-0.5 text-cyan-200">
            {getGenerationModeLabel(generationMode)}
          </span>
          <span className="rounded-full bg-white/8 px-2 py-0.5 text-gray-400">
            {generationPreset === "custom" ? "커스텀" : CALL_DOC_PRESET_DEFINITIONS[generationPreset].label}
          </span>
        </div>
      </div>

      <button type="button" onClick={handleSubmit}
        disabled={mode === "file" ? !file : !directText.trim()}
        className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-medium text-white transition-all duration-[150ms] hover:bg-purple-500 disabled:opacity-40 disabled:hover:bg-purple-600">
        <Phone className="mr-2 inline h-4 w-4" />문서 생성 시작
      </button>

      {!displayRecord && history.length === 0 && savedTotalCount === 0 ? (
        <EmptyStateCard
          title="첫 문서 번들을 아직 만들지 않았습니다."
          message="녹음 파일, 회의 메모, 고객 불만 내용을 넣고 문서 구성을 고르면, PRD와 문제정의서, 고객 공유 문서, 저장 구조, 다음 액션까지 한 흐름으로 이어집니다."
          actionLabel="선택 가이드 보기"
          onAction={() => setGuideOpen(true)}
        />
      ) : null}
    </div>
  );
}
