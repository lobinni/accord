"use client";

/**
 * The creation ritual: eight steps from a question to a frozen accord.
 * Every rule the contract enforces is mirrored here so a refusal is shown in
 * words before the wallet ever opens; the review step shows exactly what
 * will be frozen, including how the sources group by publisher. The final
 * step sends create_accord carrying the bond as its value, and follows the
 * transaction to finality.
 */

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Landmark,
  Loader2,
  Plus,
  Send,
  Trash2,
} from "lucide-react";

import { useWallet } from "@/lib/wallet/wallet";
import { accordCreated, createCall, reads } from "@/lib/genlayer/contract";
import type { TxState } from "@/lib/genlayer/tx";
import { validateDraft, publisherOf, type DraftResultType, type DraftPolicy } from "@/lib/validation/request";
import { durationWords, formatGen, toAtto } from "@/lib/formatting/present";
import { Pane } from "@/components/ui/pane";
import { TxRungs } from "@/components/consensus/tx-tracker";
import { useBase, useNow, useSend } from "@/lib/genlayer/hooks";

const STEPS = ["Question", "Sources", "Answer form", "Policy", "Window", "Freshness", "Bond", "Review"];
const HOUR = 3600;
const DAY = 86400;

type Draft = {
  question: string;
  sources: { url: string; label: string; declared_class: string }[];
  resultType: DraftResultType;
  policy: DraftPolicy;
  startIn: number;
  windowDays: number;
  validityDays: number;
  freshnessHours: number;
  staleContributes: boolean;
  bondGen: string;
};

const initialDraft: Draft = {
  question: "",
  sources: [
    { url: "", label: "", declared_class: "UNKNOWN" },
    { url: "", label: "", declared_class: "UNKNOWN" },
  ],
  resultType: { kind: "CATEGORICAL", values: ["OPERATIONAL", "DEGRADED", "DOWN"] },
  policy: { kind: "MAJORITY", stale_contributes: false, min_groups: 2, min_confirmations: 1, threshold_bps: 6000 },
  startIn: HOUR,
  windowDays: 2,
  validityDays: 1,
  freshnessHours: 24,
  staleContributes: false,
  bondGen: "0.02",
};

export function CreateFlow() {
  const router = useRouter();
  const wallet = useWallet();
  const base = useBase();
  const sender = useSend();
  const now = useNow(30_000);
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(initialDraft);
  const [baselineError, setBaselineError] = useState<string | null>(null);
  const [accordId, setAccordId] = useState<string | null>(null);

  const validation = useMemo(
    () =>
      validateDraft({
        question: draft.question,
        sources: draft.sources.filter((s) => s.url.trim()),
        resultType: draft.resultType,
        policy: { ...draft.policy, stale_contributes: draft.staleContributes },
        windowStart: now + draft.startIn,
        windowEnd: now + draft.startIn + draft.windowDays * DAY,
        freshnessSeconds: draft.freshnessHours * HOUR,
        validitySeconds: draft.validityDays * DAY,
        bondAtto: toAtto(draft.bondGen),
        now,
      }),
    [draft, now],
  );

  const stepProblems = (i: number): string[] => {
    const all = validation.problems;
    // light step gating: only hard block navigation for the early structural steps
    if (i === 0) return draft.question.trim() ? [] : ["A question is required."];
    if (i === 1) return all.filter((p) => p.startsWith("Source") || p.includes("sources"));
    return [];
  };

  const canNext = stepProblems(step).length === 0;

  async function sign() {
    setBaselineError(null);
    if (!base || !wallet.account || !validation.ok || !validation.termsJson) return;
    const who = wallet.account;
    // The counters before signing establish the baseline for creation and
    // refused-deposit returns.
    let known = 0;
    let knownReturned = 0;
    try {
      const [byCreatorRes, returnedRes, protocolRes] = await Promise.all([
        reads.byCreator(base.client, base.config, who, 0, 1).catch(() => null),
        reads.returnedFor(base.client, base.config, who, 0, 1).catch(() => null),
        reads.protocol(base.client, base.config).catch(() => null),
      ]);
      known = byCreatorRes?.total ?? protocolRes?.accord_count ?? 0;
      knownReturned = returnedRes?.total ?? 0;
    } catch {
      /* proceed with zero baseline */
    }
    await sender.send({
      call: createCall(
        draft.question.replace(/\s+/g, " ").trim(),
        validation.termsJson,
        toAtto(draft.bondGen),
      ),
      reconciled: accordCreated(base.client, base.config, who, known, knownReturned),
      onRecorded: async () => {
        const page = await reads.byCreator(base.client, base.config, who, 0, 1).catch(() => null);
        const id = page?.items[0]?.accord_id;
        if (id) {
          setAccordId(id);
        } else {
          const info = await reads.protocol(base.client, base.config).catch(() => null);
          if (info && info.accord_count > 0) setAccordId(String(info.accord_count));
        }
      },
    });
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Create accord</p>
      <h1 className="display mt-3 text-4xl">Freeze a question.</h1>
      <p className="mt-2 text-sm text-[var(--ink-dim)]">
        Eight steps. What you fix here cannot be softened later — the contract validates the same
        rules again before it accepts the request.
      </p>

      {/* progress rail */}
      <ol className="mt-8 grid grid-cols-8 border border-[var(--line)]">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={`border-[var(--line)] px-2 py-2.5 text-center ${i < STEPS.length - 1 ? "border-r" : ""} ${
              i === step ? "bg-[rgba(53,213,180,0.1)]" : i < step ? "bg-[rgba(251,252,249,0.03)]" : ""
            }`}
          >
            <p className={`mono text-[9px] uppercase tracking-[0.14em] ${i === step ? "text-[var(--mint)]" : "text-[var(--muted)]"}`}>
              {i + 1}. {s}
            </p>
          </li>
        ))}
      </ol>

      <div className="pane mt-6 p-6 md:p-8">
        {step === 0 && <StepQuestion draft={draft} set={set} />}
        {step === 1 && <StepSources draft={draft} set={set} />}
        {step === 2 && <StepAnswerForm draft={draft} set={set} />}
        {step === 3 && <StepPolicy draft={draft} set={set} />}
        {step === 4 && <StepWindow draft={draft} set={set} />}
        {step === 5 && <StepFreshness draft={draft} set={set} />}
        {step === 6 && <StepBond draft={draft} set={set} />}
        {step === 7 && (
          <StepReview
            draft={draft}
            validation={validation}
            now={now}
            accordId={accordId}
            txState={sender.state}
            busy={sender.busy}
            baselineError={baselineError}
            onSubmit={sign}
            onOpen={() => accordId && router.push(`/accord/${accordId}`)}
          />
        )}

        {step < 7 && (
          <div className="mt-8 flex items-center justify-between border-t border-[var(--line)] pt-5">
            <button className="btn btn--ghost" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft size={13} /> Back
            </button>
            <div>
              {stepProblems(step)[0] && (
                <p className="mono mb-2 text-right text-[10.5px] text-[var(--amber)]">{stepProblems(step)[0]}</p>
              )}
              <button className="btn btn--mint" disabled={!canNext} onClick={() => setStep((s) => s + 1)}>
                Continue <ArrowRight size={13} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── steps ─────────────────────────────────────────────────────────────── */

function StepTitle({ n, title, hint }: { n: string; title: string; hint: string }) {
  return (
    <div className="mb-6">
      <p className="mono text-[10px] tracking-[0.2em] text-[var(--mint)]">STEP {n}</p>
      <h2 className="display mt-2 text-2xl">{title}</h2>
      <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--muted)]">{hint}</p>
    </div>
  );
}

function StepQuestion({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <div>
      <StepTitle n="1" title="The question" hint="One question, in plain language, that the named sources can answer. Up to 300 characters." />
      <textarea
        className="field min-h-28"
        placeholder="e.g. Is the Meridian Relay network fully operational right now?"
        value={draft.question}
        maxLength={300}
        onChange={(e) => set({ question: e.target.value })}
      />
      <p className="mono mt-2 text-right text-[10px] text-[var(--muted)]">{draft.question.length} / 300</p>
    </div>
  );
}

function StepSources({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const update = (i: number, patch: Partial<Draft["sources"][number]>) =>
    set({ sources: draft.sources.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return (
    <div>
      <StepTitle
        n="2"
        title="The sources"
        hint="Two to six https pages allowed to answer. Sources are counted by publisher, not by URL — the grouping below is exactly what the contract will compute."
      />
      <div className="space-y-4">
        {draft.sources.map((s, i) => (
          <div key={i} className="border border-[var(--line)] p-4">
            <div className="flex items-center justify-between">
              <p className="mono text-[10px] tracking-[0.2em] text-[var(--mint)]">SOURCE S{i + 1}</p>
              {draft.sources.length > 2 && (
                <button className="text-[var(--muted)] hover:text-[var(--danger)]" onClick={() => set({ sources: draft.sources.filter((_, j) => j !== i) })}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <input
              className="field mt-3"
              placeholder="https://status.example.com/current"
              value={s.url}
              onChange={(e) => update(i, { url: e.target.value })}
            />
            <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px]">
              <input
                className="field"
                placeholder="A short label (optional)"
                maxLength={80}
                value={s.label}
                onChange={(e) => update(i, { label: e.target.value })}
              />
              <select className="field" value={s.declared_class} onChange={(e) => update(i, { declared_class: e.target.value })}>
                <option value="UNKNOWN">Class: unknown</option>
                <option value="OFFICIAL">Class: official</option>
                <option value="INDEPENDENT">Class: independent</option>
              </select>
            </div>
            {s.url.startsWith("https://") && s.url.includes(".") && (
              <p className="mono mt-2 text-[10px] text-[var(--muted)]">
                publisher: <span className="text-[var(--mint)]">{(() => { try { return publisherOf(s.url); } catch { return "…"; } })()}</span>
                {"  ·  "}counted once per publisher
              </p>
            )}
          </div>
        ))}
      </div>
      {draft.sources.length < 6 && (
        <button className="btn mt-4 w-full" onClick={() => set({ sources: [...draft.sources, { url: "", label: "", declared_class: "UNKNOWN" }] })}>
          <Plus size={13} /> Add a source
        </button>
      )}
    </div>
  );
}

function StepAnswerForm({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const rt = draft.resultType;
  return (
    <div>
      <StepTitle n="3" title="The answer form" hint="The exact shape an answer must take. Claims that do not fit the form are model errors, not answers." />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["CATEGORICAL", "BOOLEAN", "NUMERIC", "TEMPORAL"] as const).map((k) => (
          <button
            key={k}
            className={`border px-3 py-3 text-left transition-colors ${rt.kind === k ? "border-[rgba(53,213,180,0.6)] bg-[rgba(53,213,180,0.08)]" : "border-[var(--line)]"}`}
            onClick={() =>
              set({
                resultType:
                  k === "CATEGORICAL"
                    ? { kind: k, values: ["OPERATIONAL", "DOWN"] }
                    : k === "NUMERIC"
                      ? { kind: k, unit: "GEN", decimals: 2, tolerance_bps: 50 }
                      : { kind: k },
              })
            }
          >
            <p className="display text-sm">{k.toLowerCase()}</p>
            <p className="mono mt-1 text-[9.5px] text-[var(--muted)]">
              {k === "CATEGORICAL" ? "fixed values" : k === "BOOLEAN" ? "true / false" : k === "NUMERIC" ? "a figure" : "a date"}
            </p>
          </button>
        ))}
      </div>

      {rt.kind === "CATEGORICAL" && (
        <div className="mt-5">
          <p className="label mb-2">Allowed values — uppercase words, 2 to 8</p>
          <div className="flex flex-wrap gap-2">
            {rt.values.map((v, i) => (
              <span key={i} className="chip">
                {v}
                {rt.values.length > 2 && (
                  <button onClick={() => set({ resultType: { kind: "CATEGORICAL", values: rt.values.filter((_, j) => j !== i) } })}>
                    <Trash2 size={11} />
                  </button>
                )}
              </span>
            ))}
          </div>
          <AddValue
            onAdd={(v) => rt.values.length < 8 && set({ resultType: { kind: "CATEGORICAL", values: [...rt.values, v] } })}
          />
        </div>
      )}

      {rt.kind === "NUMERIC" && (
        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="label mb-1.5 block">Unit</span>
            <input className="field" value={rt.unit} maxLength={24} onChange={(e) => set({ resultType: { ...rt, unit: e.target.value } })} />
          </label>
          <label className="block">
            <span className="label mb-1.5 block">Decimals (0–6)</span>
            <input className="field" type="number" min={0} max={6} value={rt.decimals} onChange={(e) => set({ resultType: { ...rt, decimals: Number(e.target.value) } })} />
          </label>
          <label className="block">
            <span className="label mb-1.5 block">Tolerance (bps)</span>
            <input className="field" type="number" min={0} max={2000} value={rt.tolerance_bps} onChange={(e) => set({ resultType: { ...rt, tolerance_bps: Number(e.target.value) } })} />
          </label>
          <p className="text-[12px] text-[var(--muted)] sm:col-span-3">
            Two figures agree when they differ by at most {(rt.tolerance_bps / 100).toFixed(2)}% relative to the larger one.
          </p>
        </div>
      )}
    </div>
  );
}

function AddValue({ onAdd }: { onAdd: (v: string) => void }) {
  const [v, setV] = useState("");
  return (
    <div className="mt-3 flex gap-2">
      <input
        className="field max-w-56"
        placeholder="NEW_VALUE"
        value={v}
        onChange={(e) => setV(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
      />
      <button
        className="btn"
        onClick={() => {
          if (v) onAdd(v);
          setV("");
        }}
      >
        <Plus size={13} /> Add
      </button>
    </div>
  );
}

function StepPolicy({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const p = draft.policy;
  const opts = [
    { kind: "MAJORITY", d: "More than half of the counted publishers agree." },
    { kind: "THRESHOLD", d: "The leading claim reaches a set share of counted publishers." },
    { kind: "AUTHORITY_CONFIRMATION", d: "The official source agrees, confirmed independently." },
    { kind: "STRICT", d: "Every counted publisher agrees." },
  ] as const;
  return (
    <div>
      <StepTitle n="4" title="The policy" hint="How agreement becomes the state. Applied in code, identically on every validator." />
      <div className="grid gap-2 sm:grid-cols-2">
        {opts.map((o) => (
          <button
            key={o.kind}
            className={`border p-4 text-left transition-colors ${p.kind === o.kind ? "border-[rgba(53,213,180,0.6)] bg-[rgba(53,213,180,0.08)]" : "border-[var(--line)]"}`}
            onClick={() => set({ policy: { ...p, kind: o.kind } })}
          >
            <p className="display text-sm">{o.kind.replace(/_/g, " ").toLowerCase()}</p>
            <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted)]">{o.d}</p>
          </button>
        ))}
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {p.kind === "THRESHOLD" && (
          <label className="block">
            <span className="label mb-1.5 block">Required share (basis points)</span>
            <input className="field" type="number" min={5001} max={10000} step={100} value={p.threshold_bps} onChange={(e) => set({ policy: { ...p, threshold_bps: Number(e.target.value) } })} />
          </label>
        )}
        {p.kind === "AUTHORITY_CONFIRMATION" ? (
          <label className="block">
            <span className="label mb-1.5 block">Independent confirmations needed</span>
            <input className="field" type="number" min={1} max={5} value={p.min_confirmations} onChange={(e) => set({ policy: { ...p, min_confirmations: Number(e.target.value) } })} />
          </label>
        ) : (
          <label className="block">
            <span className="label mb-1.5 block">Minimum independent publishers</span>
            <input className="field" type="number" min={2} max={6} value={p.min_groups} onChange={(e) => set({ policy: { ...p, min_groups: Number(e.target.value) } })} />
          </label>
        )}
      </div>
      <p className="mono mt-4 text-[10px] leading-relaxed text-[var(--muted)]">
        AUTHORITY CONFIRMATION NEEDS AT LEAST ONE SOURCE DECLARED OFFICIAL IN STEP 2.
      </p>
    </div>
  );
}

function StepWindow({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <div>
      <StepTitle n="5" title="The observation window" hint="When validators may read. At least ten minutes, at most a year." />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label mb-1.5 block">Opens</span>
          <select className="field" value={draft.startIn} onChange={(e) => set({ startIn: Number(e.target.value) })}>
            <option value={300}>in 5 minutes</option>
            <option value={HOUR}>in 1 hour</option>
            <option value={6 * HOUR}>in 6 hours</option>
            <option value={DAY}>tomorrow</option>
          </select>
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Lasts</span>
          <select className="field" value={draft.windowDays} onChange={(e) => set({ windowDays: Number(e.target.value) })}>
            <option value={1}>1 day</option>
            <option value={2}>2 days</option>
            <option value={7}>1 week</option>
            <option value={30}>1 month</option>
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="label mb-1.5 block">Each finalized result stays current for</span>
          <select className="field" value={draft.validityDays} onChange={(e) => set({ validityDays: Number(e.target.value) })}>
            <option value={1}>1 day</option>
            <option value={7}>1 week</option>
            <option value={30}>1 month</option>
          </select>
        </label>
      </div>
    </div>
  );
}

function StepFreshness({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <div>
      <StepTitle n="6" title="Freshness" hint="How recent a source's own date must be for its claim to count." />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label mb-1.5 block">Evidence older than</span>
          <select className="field" value={draft.freshnessHours} onChange={(e) => set({ freshnessHours: Number(e.target.value) })}>
            <option value={1}>1 hour</option>
            <option value={24}>24 hours</option>
            <option value={168}>1 week</option>
            <option value={720}>1 month</option>
            <option value={0}>no freshness requirement</option>
          </select>
        </label>
        <label className="block">
          <span className="label mb-1.5 block">Stale evidence may still count</span>
          <select className="field" value={draft.staleContributes ? "yes" : "no"} onChange={(e) => set({ staleContributes: e.target.value === "yes" })}>
            <option value="no">No — exclusion</option>
            <option value="yes">Yes — with a warning</option>
          </select>
        </label>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-[var(--muted)]">
        {draft.freshnessHours === 0
          ? "With no freshness requirement, any readable, grounded claim counts, whatever its age."
          : `A source whose information is older than ${durationWords(draft.freshnessHours * HOUR)} is kept out ${draft.staleContributes ? "only if you disallowed stale evidence — here it still counts." : "of the count."}`}
      </p>
    </div>
  );
}

function StepBond({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  return (
    <div>
      <StepTitle n="7" title="The bond" hint="A GEN deposit against spam. It never influences the result and returns whole to you when the request closes." />
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr]">
        <label className="block">
          <span className="label mb-1.5 block">Bond in GEN</span>
          <input className="field" inputMode="decimal" value={draft.bondGen} onChange={(e) => set({ bondGen: e.target.value })} />
        </label>
        <div className="border border-[var(--line)] p-4">
          <p className="label mb-2">Custody</p>
          <p className="text-[13px] leading-relaxed text-[var(--ink-dim)]">
            {formatGen(toAtto(draft.bondGen))} GEN attaches to the creating transaction, stays locked while the
            window runs, and is refunded in full — never to the caller, always to you.
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {["0.01", "0.02", "0.05", "0.1"].map((g) => (
          <button key={g} className={`chip ${draft.bondGen === g ? "chip--live" : ""}`} onClick={() => set({ bondGen: g })}>
            {g} GEN
          </button>
        ))}
      </div>
    </div>
  );
}

function StepReview({
  draft,
  validation,
  now,
  accordId,
  txState,
  busy,
  baselineError,
  onSubmit,
  onOpen,
}: {
  draft: Draft;
  validation: ReturnType<typeof validateDraft>;
  now: number;
  accordId: string | null;
  txState: TxState;
  busy: boolean;
  baselineError: string | null;
  onSubmit: () => void;
  onOpen: () => void;
}) {
  const wallet = useWallet();
  const start = now + draft.startIn;
  const end = start + draft.windowDays * DAY;
  return (
    <div>
      <StepTitle n="8" title="Review — exactly what will be frozen" hint="Check every term. After creation, nothing on this page can be edited." />

      {!validation.ok && (
        <div className="mb-5 border border-[rgba(255,77,79,0.4)] bg-[rgba(255,77,79,0.06)] p-4">
          <p className="label mb-2" style={{ color: "var(--danger)" }}>The contract would refuse this request</p>
          <ul className="space-y-1">
            {validation.problems.map((p, i) => (
              <li key={i} className="text-[13px] text-[var(--ink-dim)]">· {p}</li>
            ))}
          </ul>
        </div>
      )}

      <dl className="space-y-3 text-sm">
        <Row k="Question" v={draft.question.trim() || "—"} />
        <Row k="Answer form" v={describeForm(draft.resultType)} />
        <Row k="Policy" v={describePolicy(draft.policy, draft.staleContributes)} />
        <Row k="Window" v={`opens ${new Date(start * 1000).toUTCString().slice(0, 22)} UTC · lasts ${draft.windowDays} day(s)`} />
        <Row k="Freshness" v={draft.freshnessHours ? durationWords(draft.freshnessHours * HOUR) : "no requirement"} />
        <Row k="Result validity" v={durationWords(draft.validityDays * DAY)} />
        <Row k="Bond" v={`${formatGen(toAtto(draft.bondGen))} GEN, attached to the transaction`} />
      </dl>

      <div className="mt-5 border border-[var(--line)]">
        <p className="pane-head label">Sources group by publisher — one voice each</p>
        <ul className="divide-y divide-[var(--line)]">
          {validation.origins.map((o) => (
            <li key={o.origin} className="flex items-center justify-between px-4 py-2.5">
              <span className="mono text-xs text-[var(--ink)]">{o.origin}</span>
              <span className="mono text-[10px] text-[var(--muted)]">{o.source_ids.join(" + ")} · 1 voice</span>
            </li>
          ))}
        </ul>
      </div>

      {accordId ? (
        <div className="mt-6 border border-[rgba(53,213,180,0.5)] bg-[rgba(53,213,180,0.07)] p-5">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--mint)]">
            <Check size={15} /> The request is frozen — accord #{accordId}
          </p>
          <div className="mt-3">
            <TxRungs state={txState} />
          </div>
          <button className="btn btn--mint mt-4" onClick={onOpen}>
            Open the request <ArrowRight size={13} />
          </button>
        </div>
      ) : (
        <div className="mt-6">
          {!wallet.account && (
            <p className="mono mb-3 text-[11px] text-[var(--amber)]">
              Connect a wallet on StudioNet (chain 61999) above — the signature carries the bond.
            </p>
          )}
          {baselineError && <p className="mono mb-3 text-[11px] leading-relaxed text-[var(--amber)]">{baselineError}</p>}
          <button className="btn btn--mint w-full md:w-auto" disabled={!validation.ok || busy || !wallet.account} onClick={onSubmit}>
            {busy ? <Loader2 size={13} className="spin" /> : <Send size={13} />}
            {busy ? "Freezing…" : `Sign & freeze — ${formatGen(toAtto(draft.bondGen))} GEN bond`}
          </button>
          <div className="mt-4">
            <TxRungs state={txState} />
          </div>
          <p className="mono mt-4 flex items-center gap-2 text-[10px] tracking-[0.16em] text-[var(--muted)]">
            <Landmark size={12} /> SIGNED BY YOUR WALLET · THE APP HOLDS NO KEY · BONDS NEVER VOTE
          </p>
        </div>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-3 border-b border-[var(--line)] pb-2.5">
      <dt className="label shrink-0">{k}</dt>
      <dd className="max-w-md text-right text-[13px] leading-relaxed text-[var(--ink)]">{v}</dd>
    </div>
  );
}

function describeForm(rt: DraftResultType): string {
  if (rt.kind === "CATEGORICAL") return `one of ${rt.values.join(" · ")}`;
  if (rt.kind === "BOOLEAN") return "true or false";
  if (rt.kind === "NUMERIC") return `a number in ${rt.unit} (${rt.decimals} decimals, ${(rt.tolerance_bps / 100).toFixed(2)}% tolerance)`;
  return "a date";
}

function describePolicy(p: DraftPolicy, stale: boolean): string {
  const base =
    p.kind === "MAJORITY"
      ? `majority of at least ${p.min_groups} publishers`
      : p.kind === "THRESHOLD"
        ? `leading claim at ${(p.threshold_bps / 100).toFixed(0)}% of publishers`
        : p.kind === "AUTHORITY_CONFIRMATION"
          ? `the official source with ${p.min_confirmations} confirmation(s)`
          : "agreement of every counted publisher";
  return base + (stale ? " · stale evidence counts" : "");
}

function extractId(result: unknown): string | null {
  if (result && typeof result === "object") {
    const r = result as Record<string, unknown>;
    const v = r.result ?? r.value ?? r.returnValue ?? r.data;
    if (typeof v === "string" && /^\d+$/.test(v)) return v;
    if (v && typeof v === "object") {
      const inner = (v as Record<string, unknown>).value ?? (v as Record<string, unknown>).result;
      if (typeof inner === "string" && /^\d+$/.test(inner)) return inner;
    }
  }
  if (typeof result === "string" && /^\d+$/.test(result)) return result;
  return null;
}
