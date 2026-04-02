import { NextResponse } from "next/server";

import { routeIdParamSchema } from "@/lib/api/schemas";
import { isZodError, parseRouteParams } from "@/lib/api/validation";
import { getRecord, updateStatus } from "@/lib/call-to-prd/call-store";
import { getCallToPrdApiError } from "@/lib/call-to-prd/messages";
import { readLocaleFromHeaders } from "@/lib/locale";
import { buildSavedBundleEntryName, buildSavedBundleEntryPath, loadSavedBundle } from "@/lib/call-to-prd/saved-bundles";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const locale = readLocaleFromHeaders(request.headers);
  let id = "";

  try {
    ({ id } = await parseRouteParams(params, routeIdParamSchema));
  } catch (error) {
    if (isZodError(error)) {
      return NextResponse.json(
        { error: getCallToPrdApiError(locale, "INVALID_INPUT", locale === "en" ? "Invalid record id." : "유효하지 않은 기록 ID입니다.") },
        { status: 400 },
      );
    }

    throw error;
  }

  const record = getRecord(id);
  if (!record) {
    return NextResponse.json({ error: getCallToPrdApiError(locale, "NOT_FOUND", locale === "en" ? "Record not found." : "기록 없음") }, { status: 404 });
  }

  const recovered = await recoverRecordFromSavedBundle(record);
  return NextResponse.json(recovered);
}

async function recoverRecordFromSavedBundle(record: NonNullable<ReturnType<typeof getRecord>>) {
  // Try new project-subfolder path first, then fall back to old flat entry name
  const entryPath = buildSavedBundleEntryPath(record.id, record.projectName, record.customerName, record.callDate);
  const flatEntryName = buildSavedBundleEntryName(record.id, record.projectName, record.customerName, record.callDate);
  const savedBundle =
    (await loadSavedBundle(entryPath)) ??
    (await loadSavedBundle(flatEntryName));

  if (!savedBundle || savedBundle.kind !== "bundle") {
    return record;
  }

  const entryName = savedBundle.entryName;

  const hasAllSelectedDocs = record.selectedDocTypes.every((docType) =>
    savedBundle.generatedDocs.some((doc) => doc.type === docType),
  );

  if (hasAllSelectedDocs && record.status !== "completed") {
    updateStatus(record.id, "completed", {
      savedEntryName: entryName,
      completedAt: savedBundle.createdAt,
      projectPath: savedBundle.projectPath,
      inputKind: savedBundle.inputKind,
      severity: savedBundle.severity,
      customerImpact: savedBundle.customerImpact,
      urgency: savedBundle.urgency,
      reproducibility: savedBundle.reproducibility,
      currentWorkaround: savedBundle.currentWorkaround,
      separateExternalDocs: savedBundle.separateExternalDocs,
      projectContext: savedBundle.projectContext,
      projectContextSources: savedBundle.projectContextSources,
      projectContextError: savedBundle.projectContextError,
      prdMarkdown: savedBundle.prdMarkdown,
      claudePrd: savedBundle.claudePrd,
      codexPrd: savedBundle.codexPrd,
      diffReport: savedBundle.diffReport,
      generatedDocs: savedBundle.generatedDocs,
      nextActions: savedBundle.nextActions,
      generationWarnings: savedBundle.generationWarnings,
      docGenerationProgress: null,
      error: null,
    });

    return getRecord(record.id) ?? record;
  }

  if (!record.savedEntryName || record.generatedDocs.length < savedBundle.generatedDocs.length) {
    updateStatus(record.id, record.status, {
      savedEntryName: entryName,
      projectPath: savedBundle.projectPath,
      inputKind: savedBundle.inputKind,
      severity: savedBundle.severity,
      customerImpact: savedBundle.customerImpact,
      urgency: savedBundle.urgency,
      reproducibility: savedBundle.reproducibility,
      currentWorkaround: savedBundle.currentWorkaround,
      separateExternalDocs: savedBundle.separateExternalDocs,
      projectContext: savedBundle.projectContext,
      projectContextSources: savedBundle.projectContextSources,
      projectContextError: savedBundle.projectContextError,
      generatedDocs: savedBundle.generatedDocs,
      prdMarkdown: savedBundle.prdMarkdown,
      claudePrd: savedBundle.claudePrd,
      codexPrd: savedBundle.codexPrd,
      diffReport: savedBundle.diffReport,
      generationWarnings: savedBundle.generationWarnings,
      nextActions: savedBundle.nextActions,
    });

    return getRecord(record.id) ?? record;
  }

  return record;
}
