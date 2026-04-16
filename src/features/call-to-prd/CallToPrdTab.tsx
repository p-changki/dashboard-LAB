"use client";

import { useLocale } from "@/components/layout/LocaleProvider";
import { AppConfirmModal } from "@/components/modals/AppConfirmModal";
import { AppPromptModal } from "@/components/modals/AppPromptModal";
import { DEFAULT_CALL_INTAKE_METADATA } from "@/lib/call-to-prd/intake-config";
import { DocSelectionGuideModal } from "@/features/call-to-prd/components/DocSelectionGuideModal";
import { CallToPrdHistory } from "@/features/call-to-prd/components/CallToPrdHistory";
import { CallToPrdIntake } from "@/features/call-to-prd/components/CallToPrdIntake";
import { CallToPrdQuickIntake } from "@/features/call-to-prd/components/CallToPrdQuickIntake";
import { RecentTemplatesRow } from "@/features/call-to-prd/components/RecentTemplatesRow";
import { CallToPrdViewer } from "@/features/call-to-prd/components/CallToPrdViewer";
import { getCallToPrdCopy } from "@/features/call-to-prd/copy";
import { useCallToPrdActions } from "@/features/call-to-prd/hooks/useCallToPrdActions";
import { useCallToPrdData } from "@/features/call-to-prd/hooks/useCallToPrdData";
import { useCallToPrdWorkspace } from "@/features/call-to-prd/hooks/useCallToPrdWorkspace";
import type { CallToPrdTabProps } from "@/features/call-to-prd/state";

export function CallToPrdTab({ mode: navigationMode = "advanced" }: CallToPrdTabProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const workspace = useCallToPrdWorkspace(navigationMode);
  const data = useCallToPrdData({
    projectPath: workspace.projectPath,
    savedPage: workspace.savedPage,
    deferredSavedQuery: workspace.deferredSavedQuery,
    setHistory: workspace.setHistory,
    setSavedBundles: workspace.setSavedBundles,
    setSavedTotalCount: workspace.setSavedTotalCount,
    setSavedTotalPages: workspace.setSavedTotalPages,
    setSavedPage: workspace.setSavedPage,
    setProjects: workspace.setProjects,
    setCurrentProjectPath: workspace.setCurrentProjectPath,
    setProjectContextStatus: workspace.setProjectContextStatus,
    setProjectContextSummary: workspace.setProjectContextSummary,
    setProjectContextSources: workspace.setProjectContextSources,
    setProjectContextError: workspace.setProjectContextError,
    setTemplateSets: workspace.setTemplateSets,
    setCurrent: workspace.setCurrent,
  });
  const actions = useCallToPrdActions({
    mode: workspace.mode,
    file: workspace.file,
    pdfFile: workspace.pdfFile,
    directText: workspace.directText,
    projectName: workspace.projectName,
    projectPath: workspace.projectPath,
    projectContextStatus: workspace.projectContextStatus,
    projectContextError: workspace.projectContextError,
    customerName: workspace.customerName,
    additionalContext: workspace.additionalContext,
    inputKind: workspace.inputKind,
    severity: workspace.severity,
    customerImpact: workspace.customerImpact,
    urgency: workspace.urgency,
    reproducibility: workspace.reproducibility,
    currentWorkaround: workspace.currentWorkaround,
    separateExternalDocs: workspace.separateExternalDocs,
    baselineEntryName: workspace.baselineEntryName,
    generationMode: workspace.generationMode,
    generationPreset: workspace.generationPreset,
    selectedDocTypes: workspace.selectedDocTypes,
    selectedProject: workspace.selectedProject,
    selectedSaved: workspace.selectedSaved,
    displayRecord: workspace.displayRecord,
    displayDocs: workspace.displayDocs,
    activeDocType: workspace.activeDocType,
    prdView: workspace.prdView,
    selectedDocContent: workspace.selectedDocContent,
    projects: workspace.projects,
    setSubTab: workspace.setSubTab,
    setIntakeMode: workspace.setIntakeMode,
    setIntakeStep: workspace.setIntakeStep,
    setSelectedHistory: workspace.setSelectedHistory,
    setSelectedSaved: workspace.setSelectedSaved,
    setCurrent: workspace.setCurrent,
    setActiveDocType: workspace.setActiveDocType,
    setPrdView: workspace.setPrdView,
    setFeedbackMessage: workspace.setFeedbackMessage,
    setNextActionLoading: workspace.setNextActionLoading,
    setNextActionResults: workspace.setNextActionResults,
    setActiveNextAction: workspace.setActiveNextAction,
    setGenerationPreset: workspace.setGenerationPreset,
    setSelectedDocTypes: workspace.setSelectedDocTypes,
    setSavedQuery: workspace.setSavedQuery,
    setSavedPage: workspace.setSavedPage,
    setProjectPath: workspace.setProjectPath,
    setProjectName: workspace.setProjectName,
    setTemplateSets: workspace.setTemplateSets,
    setConfirmDialog: workspace.setConfirmDialog,
    setPromptDialog: workspace.setPromptDialog,
    setCustomerName: workspace.setCustomerName,
    setAdditionalContext: workspace.setAdditionalContext,
    setInputKind: workspace.setInputKind,
    setSeverity: workspace.setSeverity,
    setCustomerImpact: workspace.setCustomerImpact,
    setUrgency: workspace.setUrgency,
    setReproducibility: workspace.setReproducibility,
    setCurrentWorkaround: workspace.setCurrentWorkaround,
    setSeparateExternalDocs: workspace.setSeparateExternalDocs,
    setBaselineEntryName: workspace.setBaselineEntryName,
    setGenerationMode: workspace.setGenerationMode,
    setFile: workspace.setFile,
    setPdfFile: workspace.setPdfFile,
    setMode: workspace.setMode,
    setDirectText: workspace.setDirectText,
    setHistory: workspace.setHistory,
    fetchSaved: data.fetchSaved,
    startPolling: data.startPolling,
  });
  const quickProjectPath = workspace.projectPath || workspace.currentProjectPath;
  const quickProject = workspace.projects.find((project) => project.path === quickProjectPath) ?? null;

  function handleQuickSubmit() {
    void actions.handleSubmit({
      mode: "text",
      directText: workspace.directText,
      projectPath: quickProjectPath,
      projectName: quickProject?.name ?? workspace.projectName,
      customerName: "",
      additionalContext: "",
      inputKind: DEFAULT_CALL_INTAKE_METADATA.inputKind,
      severity: DEFAULT_CALL_INTAKE_METADATA.severity,
      customerImpact: DEFAULT_CALL_INTAKE_METADATA.customerImpact,
      urgency: DEFAULT_CALL_INTAKE_METADATA.urgency,
      reproducibility: DEFAULT_CALL_INTAKE_METADATA.reproducibility,
      currentWorkaround: "",
      separateExternalDocs: DEFAULT_CALL_INTAKE_METADATA.separateExternalDocs,
      baselineEntryName: "",
      generationPreset: "quick",
      selectedDocTypes: ["prd"],
    });
  }

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border-base bg-[radial-gradient(circle_at_top_left,_rgba(192,132,252,0.16),_transparent_42%),linear-gradient(180deg,_rgba(20,20,20,0.94),_rgba(14,14,14,0.98))] p-6">
        <p className="text-xs uppercase tracking-[0.24em] text-purple-200/80">{copy.tab.heroEyebrow}</p>
        <h2 className="mt-3 text-xl font-semibold tracking-tight text-white">{copy.tab.heroTitle}</h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-text-secondary">
          {copy.tab.heroDescription}
        </p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {copy.tab.cards.map((item) => (
            <article key={item.label} className="rounded-2xl border border-border-base bg-black/15 px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-purple-200/70">{item.label}</p>
              <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-2 text-xs leading-6 text-text-secondary">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => workspace.setSubTab("intake")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${workspace.subTab === "intake" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-bg-card text-text-muted border border-border-base"}`}
        >
          {copy.tab.tabs.intake}
        </button>
        <button
          type="button"
          onClick={() => workspace.setSubTab("viewer")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${workspace.subTab === "viewer" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-bg-card text-text-muted border border-border-base"}`}
        >
          {copy.tab.tabs.viewer}
        </button>
        <button
          type="button"
          onClick={() => workspace.setSubTab("history")}
          className={`rounded-full px-4 py-2 text-sm transition-all duration-[150ms] ${workspace.subTab === "history" ? "bg-purple-900/30 text-purple-300 border border-purple-500/20" : "bg-bg-card text-text-muted border border-border-base"}`}
        >
          {copy.tab.tabs.history}
        </button>
      </div>

      {workspace.subTab === "intake" ? (
        <div className="space-y-5">
          <RecentTemplatesRow
            templateSets={workspace.templateSets}
            onApply={actions.applyTemplateSet}
            onDelete={actions.handleDeleteTemplateSet}
          />

          <section className="rounded-3xl border border-border-base bg-white/[0.03] p-2">
            <div className="grid gap-2 md:grid-cols-2">
              {(["quick", "pro"] as const).map((mode) => {
                const active = workspace.intakeMode === mode;
                const modeCopy = copy.tab.intakeModes[mode];

                return (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => workspace.setIntakeMode(mode)}
                    className={`rounded-[22px] border px-4 py-4 text-left transition-all ${
                      active
                        ? "border-cyan-400/25 bg-cyan-400/[0.08] text-white"
                        : "border-border-base bg-black/10 text-text-secondary hover:bg-white/[0.04]"
                    }`}
                  >
                    <p className="text-sm font-semibold">{modeCopy.label}</p>
                    <p className="mt-1 text-xs leading-6 opacity-80">{modeCopy.description}</p>
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      ) : null}

      {workspace.subTab === "intake" ? (
        workspace.intakeMode === "quick" ? (
          <CallToPrdQuickIntake
            feedbackMessage={workspace.feedbackMessage}
            directText={workspace.directText}
            setDirectText={workspace.setDirectText}
            projectPath={quickProjectPath}
            projects={workspace.projects}
            currentProjectPath={workspace.currentProjectPath}
            selectedProject={quickProject}
            projectContextStatus={workspace.projectContextStatus}
            projectContextSummary={workspace.projectContextSummary}
            projectContextSources={workspace.projectContextSources}
            projectContextError={workspace.projectContextError}
            generationMode={workspace.generationMode}
            handleProjectSelect={actions.handleProjectSelect}
            handleSubmit={handleQuickSubmit}
          />
        ) : (
          <CallToPrdIntake
            isCoreMode={workspace.isCoreMode}
            feedbackMessage={workspace.feedbackMessage}
            stepIndex={workspace.intakeStep}
            setStepIndex={workspace.setIntakeStep}
            mode={workspace.mode}
            setMode={workspace.setMode}
            file={workspace.file}
            setFile={workspace.setFile}
            pdfFile={workspace.pdfFile}
            setPdfFile={workspace.setPdfFile}
            directText={workspace.directText}
            setDirectText={workspace.setDirectText}
            projectPath={workspace.projectPath}
            projectName={workspace.projectName}
            setProjectName={workspace.setProjectName}
            projectContextStatus={workspace.projectContextStatus}
            projectContextSummary={workspace.projectContextSummary}
            projectContextSources={workspace.projectContextSources}
            projectContextError={workspace.projectContextError}
            customerName={workspace.customerName}
            setCustomerName={workspace.setCustomerName}
            additionalContext={workspace.additionalContext}
            setAdditionalContext={workspace.setAdditionalContext}
            projects={workspace.projects}
            currentProjectPath={workspace.currentProjectPath}
            selectedProject={workspace.selectedProject}
            handleProjectSelect={actions.handleProjectSelect}
            inputKind={workspace.inputKind}
            setInputKind={workspace.setInputKind}
            severity={workspace.severity}
            setSeverity={workspace.setSeverity}
            customerImpact={workspace.customerImpact}
            setCustomerImpact={workspace.setCustomerImpact}
            urgency={workspace.urgency}
            setUrgency={workspace.setUrgency}
            reproducibility={workspace.reproducibility}
            setReproducibility={workspace.setReproducibility}
            currentWorkaround={workspace.currentWorkaround}
            setCurrentWorkaround={workspace.setCurrentWorkaround}
            separateExternalDocs={workspace.separateExternalDocs}
            setSeparateExternalDocs={workspace.setSeparateExternalDocs}
            needsChangeBaseline={workspace.needsChangeBaseline}
            baselineEntryName={workspace.baselineEntryName}
            setBaselineEntryName={workspace.setBaselineEntryName}
            savedBundles={workspace.savedBundles}
            activeQueue={workspace.activeQueue}
            recentQueue={workspace.recentQueue}
            setSelectedHistory={workspace.setSelectedHistory}
            setSelectedSaved={workspace.setSelectedSaved}
            handleRetryRecord={actions.handleRetryRecord}
            handleDeleteHistoryRecord={(id) => void actions.handleDeleteHistoryRecord(id)}
            availableTemplateSets={workspace.availableTemplateSets}
            applyTemplateSet={actions.applyTemplateSet}
            handleSaveTemplateSet={actions.handleSaveTemplateSet}
            handleDeleteTemplateSet={actions.handleDeleteTemplateSet}
            generationMode={workspace.generationMode}
            setGenerationMode={workspace.setGenerationMode}
            generationPreset={workspace.generationPreset}
            applyPreset={actions.applyPreset}
            selectedDocTypes={workspace.selectedDocTypes}
            toggleDocType={actions.toggleDocType}
            setGuideOpen={workspace.setGuideOpen}
            handleSubmit={() => void actions.handleSubmit()}
            displayRecord={workspace.displayRecord}
            history={workspace.history}
            savedTotalCount={workspace.savedTotalCount}
          />
        )
      ) : null}

      {workspace.subTab === "viewer" ? (
        <CallToPrdViewer
          current={workspace.current}
          displayRecord={workspace.displayRecord}
          hasSupportDocs={workspace.hasSupportDocs}
          displayDocs={workspace.displayDocs}
          activeDocType={workspace.activeDocType}
          setActiveDocType={workspace.setActiveDocType}
          prdView={workspace.prdView}
          setPrdView={workspace.setPrdView}
          selectedDocContent={workspace.selectedDocContent}
          renderedDocContent={workspace.renderedDocContent}
          generationWarnings={workspace.generationWarnings}
          docResultsOpen={workspace.docResultsOpen}
          setDocResultsOpen={workspace.setDocResultsOpen}
          docContentOpen={workspace.docContentOpen}
          setDocContentOpen={workspace.setDocContentOpen}
          savedTreeOpen={workspace.savedTreeOpen}
          setSavedTreeOpen={workspace.setSavedTreeOpen}
          nextActionsOpen={workspace.nextActionsOpen}
          setNextActionsOpen={workspace.setNextActionsOpen}
          nextActionContentOpen={workspace.nextActionContentOpen}
          setNextActionContentOpen={workspace.setNextActionContentOpen}
          displaySavedEntryName={workspace.displaySavedEntryName}
          availableNextActions={workspace.availableNextActions}
          nextActionLoading={workspace.nextActionLoading}
          nextActionResults={workspace.nextActionResults}
          activeNextAction={workspace.activeNextAction}
          setActiveNextAction={workspace.setActiveNextAction}
          activeNextActionResult={workspace.activeNextActionResult}
          nextActionList={workspace.nextActionList}
          renderedNextActionContent={workspace.renderedNextActionContent}
          handleRetryRecord={actions.handleRetryRecord}
          handleGenerateNextAction={(actionType) => void actions.handleGenerateNextAction(actionType)}
          regenerateSection={(sectionId, hint) => actions.regenerateSection(sectionId, hint)}
          exportToObsidian={() => actions.exportToObsidian()}
          copyGithubIssueDraft={() => actions.copyGithubIssueDraft()}
          downloadCurrentMarkdown={actions.downloadCurrentMarkdown}
          downloadNextActionMarkdown={() => actions.downloadNextActionMarkdown(workspace.activeNextActionResult)}
        />
      ) : null}

      {workspace.subTab === "history" ? (
        <CallToPrdHistory
          history={workspace.history}
          selectedHistory={workspace.selectedHistory}
          setSelectedHistory={workspace.setSelectedHistory}
          setSelectedSaved={workspace.setSelectedSaved}
          handleRetryRecord={actions.handleRetryRecord}
          handleDeleteHistoryRecord={(id) => void actions.handleDeleteHistoryRecord(id)}
          historyOpen={workspace.historyOpen}
          setHistoryOpen={workspace.setHistoryOpen}
          savedBundles={workspace.savedBundles}
          savedQuery={workspace.savedQuery}
          handleSavedQueryChange={actions.handleSavedQueryChange}
          savedPage={workspace.savedPage}
          setSavedPage={workspace.setSavedPage}
          savedTotalCount={workspace.savedTotalCount}
          savedTotalPages={workspace.savedTotalPages}
          selectedSaved={workspace.selectedSaved}
          savedOpen={workspace.savedOpen}
          setSavedOpen={workspace.setSavedOpen}
          setCurrent={workspace.setCurrent}
          setActiveDocType={workspace.setActiveDocType}
          onNavigateToViewer={() => workspace.setSubTab("viewer")}
          handleDeleteSavedBundle={(entryName) => void actions.handleDeleteSavedBundle(entryName)}
        />
      ) : null}

      <DocSelectionGuideModal
        open={workspace.guideOpen}
        onClose={() => workspace.setGuideOpen(false)}
        onApplyPreset={(preset) => actions.applyPreset(preset)}
      />
      <AppConfirmModal
        open={Boolean(workspace.confirmDialog)}
        title={workspace.confirmDialog?.title ?? ""}
        message={workspace.confirmDialog?.message ?? ""}
        confirmLabel={workspace.confirmDialog?.confirmLabel}
        tone={workspace.confirmDialog?.tone}
        onClose={() => workspace.setConfirmDialog(null)}
        onConfirm={async () => {
          if (!workspace.confirmDialog) {
            return;
          }
          await workspace.confirmDialog.onConfirm();
        }}
      />
      <AppPromptModal
        open={Boolean(workspace.promptDialog)}
        title={workspace.promptDialog?.title ?? ""}
        message={workspace.promptDialog?.message ?? ""}
        placeholder={workspace.promptDialog?.placeholder}
        initialValue={workspace.promptDialog?.initialValue}
        confirmLabel={workspace.promptDialog?.confirmLabel}
        onClose={() => workspace.setPromptDialog(null)}
        onConfirm={async (value) => {
          if (!workspace.promptDialog) {
            return;
          }
          await workspace.promptDialog.onConfirm(value);
        }}
      />
    </div>
  );
}
