"use client";

import { useMemo } from "react";

import { useLocale } from "@/components/layout/LocaleProvider";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import {
  CALL_CUSTOMER_IMPACTS,
  CALL_INPUT_KINDS,
  CALL_REPRODUCIBILITY_STATES,
  CALL_SEVERITIES,
  CALL_URGENCY_LEVELS,
  type CallCustomerImpact,
  type CallInputKind,
  type CallReproducibility,
  type CallSeverity,
  type CallUrgency,
  type IntakeFieldKey,
} from "@/lib/call-to-prd/intake-config";
import type { SavedCallBundleIndexItem } from "@/lib/types/call-to-prd";
import {
  getCallCustomerImpactLabel,
  getCallInputKindLabel,
  getCallReproducibilityLabel,
  getCallSeverityLabel,
  getCallToPrdCopy,
  getCallUrgencyLabel,
} from "@/features/call-to-prd/copy";

interface CallToPrdIntakeStepContextProps {
  requiredFields: IntakeFieldKey[];
  customerName: string;
  setCustomerName: (name: string) => void;
  additionalContext: string;
  setAdditionalContext: (context: string) => void;
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
  needsChangeBaseline: boolean;
  baselineEntryName: string;
  setBaselineEntryName: (name: string) => void;
  savedBundles: SavedCallBundleIndexItem[];
}

export function CallToPrdIntakeStepContext({
  requiredFields,
  customerName,
  setCustomerName,
  additionalContext,
  setAdditionalContext,
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
}: CallToPrdIntakeStepContextProps) {
  const { locale } = useLocale();
  const copy = getCallToPrdCopy(locale);
  const visible = useMemo(() => new Set(requiredFields), [requiredFields]);

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-border-base bg-bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{copy.intake.structuringTitle}</h3>
            <p className="mt-1 text-xs leading-6 text-text-muted">{copy.intake.structuringDescription}</p>
          </div>
          <Badge variant="info">{requiredFields.length}</Badge>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.has("customerName") ? (
            <Input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder={copy.intake.customerNamePlaceholder} size="lg" />
          ) : null}
          {visible.has("additionalContext") ? (
            <Input value={additionalContext} onChange={(event) => setAdditionalContext(event.target.value)} placeholder={copy.intake.additionalContextPlaceholder} size="lg" />
          ) : null}
          {visible.has("inputKind") ? (
            <FieldSelect
              label={copy.intake.inputKind}
              value={inputKind}
              options={CALL_INPUT_KINDS}
              getLabel={(value) => getCallInputKindLabel(value, locale)}
              onChange={(value) => setInputKind(value as CallInputKind)}
            />
          ) : null}
          {visible.has("severity") ? (
            <FieldSelect
              label={copy.intake.severity}
              value={severity}
              options={CALL_SEVERITIES}
              getLabel={(value) => getCallSeverityLabel(value, locale)}
              onChange={(value) => setSeverity(value as CallSeverity)}
            />
          ) : null}
          {visible.has("customerImpact") ? (
            <FieldSelect
              label={copy.intake.impact}
              value={customerImpact}
              options={CALL_CUSTOMER_IMPACTS}
              getLabel={(value) => getCallCustomerImpactLabel(value, locale)}
              onChange={(value) => setCustomerImpact(value as CallCustomerImpact)}
            />
          ) : null}
          {visible.has("urgency") ? (
            <FieldSelect
              label={copy.intake.urgency}
              value={urgency}
              options={CALL_URGENCY_LEVELS}
              getLabel={(value) => getCallUrgencyLabel(value, locale)}
              onChange={(value) => setUrgency(value as CallUrgency)}
            />
          ) : null}
          {visible.has("reproducibility") ? (
            <FieldSelect
              label={copy.intake.reproducibility}
              value={reproducibility}
              options={CALL_REPRODUCIBILITY_STATES}
              getLabel={(value) => getCallReproducibilityLabel(value, locale)}
              onChange={(value) => setReproducibility(value as CallReproducibility)}
            />
          ) : null}
        </div>

        {visible.has("currentWorkaround") || visible.has("separateExternalDocs") ? (
          <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
            {visible.has("currentWorkaround") ? (
              <Input
                value={currentWorkaround}
                onChange={(event) => setCurrentWorkaround(event.target.value)}
                placeholder={copy.intake.workaroundPlaceholder}
              />
            ) : <div />}

            {visible.has("separateExternalDocs") ? (
              <label className="flex items-center justify-between gap-3 rounded-xl border border-border-base bg-bg-surface px-4 py-3 text-sm text-text-secondary">
                <div>
                  <p className="font-medium text-text-primary">{copy.intake.externalDocsTitle}</p>
                  <p className="mt-1 text-xs leading-5 text-text-muted">{copy.intake.externalDocsDescription}</p>
                </div>
                <input
                  type="checkbox"
                  checked={separateExternalDocs}
                  onChange={(event) => setSeparateExternalDocs(event.target.checked)}
                  className="h-4 w-4 rounded border-white/20 bg-black/20 accent-purple-400"
                />
              </label>
            ) : null}
          </div>
        ) : null}
      </section>

      {needsChangeBaseline ? (
        <section className="rounded-3xl border border-border-base bg-bg-card p-5">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">{copy.intake.baselineTitle}</h3>
            <p className="mt-1 text-xs leading-6 text-text-muted">{copy.intake.baselineDescription}</p>
          </div>
          <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto]">
            <select
              value={baselineEntryName}
              onChange={(event) => setBaselineEntryName(event.target.value)}
              className="rounded-xl border border-border-base bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
            >
              <option value="">{copy.intake.baselineAutoOption}</option>
              {savedBundles.map((bundle) => (
                <option key={bundle.entryName} value={bundle.entryName}>
                  {bundle.title} · {bundle.createdAt.slice(0, 10)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setBaselineEntryName("")}
              className="rounded-xl border border-border-base bg-bg-surface px-4 py-2 text-xs text-text-secondary transition hover:bg-bg-card-hover"
            >
              {copy.intake.baselineAutoButton}
            </button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function FieldSelect<T extends string>({
  label,
  value,
  options,
  getLabel,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  getLabel: (value: T) => string;
  onChange: (value: T) => void;
}) {
  return (
    <label className="space-y-2">
      <span className="text-xs text-text-muted">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="w-full rounded-xl border border-border-base bg-bg-surface px-4 py-2.5 text-sm text-text-primary focus:border-purple-500/40 focus:outline-none"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {getLabel(option)}
          </option>
        ))}
      </select>
    </label>
  );
}
