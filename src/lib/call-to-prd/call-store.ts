import { persistJson, readPersistentJson } from "@/lib/storage/persistent-json";
import { normalizeCallIntakeMetadata } from "@/lib/call-to-prd/intake-config";
import type { CallRecord, CallStatus } from "@/lib/types/call-to-prd";

const MAX_RECORDS = 20;
const CALL_STORE_FILE = "call-history.json";
const RECOVERY_ERROR_MESSAGE = "앱이 재시작되어 진행 중 작업이 중단되었습니다.";
const STALE_PROGRESS_MS = 7 * 60 * 1000;

function getStore(): Map<string, CallRecord> {
  const g = globalThis as unknown as { __callStore?: Map<string, CallRecord> };
  if (!g.__callStore) {
    g.__callStore = new Map(
      hydrateRecords(readPersistentJson<CallRecord[]>(CALL_STORE_FILE, [])).map((record) => [record.id, record]),
    );
  }
  return g.__callStore;
}

export function createRecord(record: CallRecord): void {
  const store = getStore();
  store.set(record.id, {
    ...record,
    updatedAt: record.updatedAt ?? new Date().toISOString(),
  });
  pruneStore(store);
  persistStore(store);
}

export function getRecord(id: string): CallRecord | undefined {
  const store = getStore();
  const record = store.get(id);

  if (!record) {
    return undefined;
  }

  return materializeRecord(store, id, record);
}

export function updateRecord(id: string, patch: Partial<CallRecord>): void {
  const store = getStore();
  const existing = store.get(id);
  if (existing) {
    store.set(id, {
      ...existing,
      ...patch,
      updatedAt: patch.updatedAt ?? new Date().toISOString(),
    });
    persistStore(store);
  }
}

export function updateStatus(id: string, status: CallStatus, extra?: Partial<CallRecord>): void {
  updateRecord(id, {
    status,
    completedAt:
      status === "completed" || status === "failed"
        ? extra?.completedAt ?? new Date().toISOString()
        : extra?.completedAt ?? null,
    ...extra,
  });
}

export function getAllRecords(): CallRecord[] {
  const store = getStore();
  return [...store.entries()].map(([id, record]) => materializeRecord(store, id, record)).reverse();
}

export function deleteRecord(id: string): boolean {
  const store = getStore();
  const deleted = store.delete(id);

  if (deleted) {
    persistStore(store);
  }

  return deleted;
}

function persistStore(store: Map<string, CallRecord>) {
  persistJson(CALL_STORE_FILE, [...store.values()]);
}

function pruneStore(store: Map<string, CallRecord>) {
  const entries = [...store.values()].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
  store.clear();
  entries.slice(-MAX_RECORDS).forEach((record) => {
    store.set(record.id, record);
  });
}

function hydrateRecords(records: CallRecord[]): CallRecord[] {
  return records
    .map((record) => recoverRecord(record))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt))
    .slice(-MAX_RECORDS);
}

function recoverRecord(record: CallRecord): CallRecord {
  const intake = normalizeCallIntakeMetadata(record);
  const normalizedRecord: CallRecord = {
    ...record,
    additionalContext: record.additionalContext ?? null,
    inputKind: intake.inputKind,
    severity: intake.severity,
    customerImpact: intake.customerImpact,
    urgency: intake.urgency,
    reproducibility: intake.reproducibility,
    currentWorkaround: intake.currentWorkaround,
    separateExternalDocs: intake.separateExternalDocs,
    generationMode: record.generationMode ?? "dual",
    updatedAt: record.updatedAt ?? record.completedAt ?? record.createdAt,
  };

  if (normalizedRecord.status === "completed" || normalizedRecord.status === "failed") {
    return normalizedRecord;
  }

  return {
    ...normalizedRecord,
    status: "failed",
    completedAt: normalizedRecord.completedAt ?? new Date().toISOString(),
    error: normalizedRecord.error ?? RECOVERY_ERROR_MESSAGE,
    docGenerationProgress: null,
  };
}

function materializeRecord(store: Map<string, CallRecord>, id: string, record: CallRecord): CallRecord {
  const next = maybeMarkRecordStale(record);
  if (next !== record) {
    store.set(id, next);
    persistStore(store);
  }
  return next;
}

function maybeMarkRecordStale(record: CallRecord): CallRecord {
  if (record.status === "completed" || record.status === "failed") {
    return record;
  }

  const lastTouchedAt = record.updatedAt ?? record.createdAt;
  const lastTouchedMs = Date.parse(lastTouchedAt);

  if (!Number.isFinite(lastTouchedMs)) {
    return record;
  }

  if (Date.now() - lastTouchedMs <= STALE_PROGRESS_MS) {
    return record;
  }

  return {
    ...record,
    status: "failed",
    completedAt: record.completedAt ?? new Date().toISOString(),
    docGenerationProgress: null,
    error: record.error ?? buildStaleProgressError(record),
  };
}

function buildStaleProgressError(record: CallRecord): string {
  const phase = record.docGenerationProgress ?? record.status;
  const partialSavedHint = record.savedEntryName ? " 이미 생성된 문서는 저장 구조에서 확인할 수 있습니다." : "";
  return `문서 생성 진행 상태가 오래 갱신되지 않아 중단되었습니다. 마지막 단계: ${phase}.${partialSavedHint}`;
}
