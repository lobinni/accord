"use client";

/**
 * The landing surface: hero statement, live protocol counters, the activity
 * the contract itself has written (transitions, requests — never demo rows),
 * the four policies, the lifecycle, and the acts any participant may send.
 */

import Link from "next/link";
import {
  ArrowRight,
  BookOpenCheck,
  Eye,
  FileCheck2,
  Gavel,
  Landmark,
  Lock,
  Radar,
  Scale,
  ShieldCheck,
  Undo2,
  Unlock,
} from "lucide-react";

import { useAccords, useNow, useProtocolInfo, useTransitions } from "@/lib/genlayer/hooks";
import { formatGen, relativeTo } from "@/lib/formatting/present";
import { Pane } from "@/components/ui/pane";

const POLICIES = [
  { icon: Scale, name: "Majority", desc: "More than half of the counted publishers agree, and at least the set minimum." },
  { icon: Gavel, name: "Threshold", desc: "The leading claim's share of counted publishers reaches the set basis points." },
  { icon: Landmark, name: "Authority confirmation", desc: "The official source agrees with enough independent confirmations." },
  { icon: ShieldCheck, name: "Strict", desc: "Every counted publisher agrees. One material contradiction leaves it unresolved." },
];

const ACTS = [
  { icon: Eye, name: "Observe", desc: "Ask every validator to fetch every source and record what it states." },
  { icon: FileCheck2, name: "Finalize", desc: "After the 5-minute contract delay, make the result the state." },
  { icon: Lock, name: "Close", desc: "End the request when its window closes; failure is recorded honestly." },
  { icon: Undo2, name: "Refund", desc: "Send the whole bond back to its creator. Once. Never to the caller." },
];

const FIREWALL = [
  { icon: BookOpenCheck, title: "The model reads", desc: "What a page claims, the passage that states it, its date — judgement, repeated independently." },
  { icon: Radar, title: "The code decides", desc: "Publishers over URLs, freshness arithmetic, the policy, the state, the bond — identical on every node." },
  { icon: Unlock, title: "The interface shows", desc: "It decides nothing and stores nothing; every value is read from the contract or the chain." },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="display text-2xl leading-none text-[var(--ink)]">{value}</p>
      <p className="label mt-1.5">{label}</p>
    </div>
  );
}

export function Landing() {
  const info = useProtocolInfo();
  const requests = info.value ? String(info.value.accord_count) : "—";
  const bonded = info.value ? `${formatGen(info.value.total_bonded)} GEN` : "—";

  return (
    <div className="relative">
      {/* ── hero ─────────────────────────────────────────────── */}
      <section className="grid items-start gap-10 pt-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div>
          <p className="eyebrow enter-up">GenLayer StudioNet · Live network protocol</p>
          <h1 className="display enter-up enter-up--1 mt-5 text-[clamp(2.6rem,6vw,4.6rem)]">
            Agreement,
            <br />
            independently
            <br />
            <span style={{ color: "var(--mint)" }}>witnessed.</span>
          </h1>
          <p className="enter-up enter-up--2 mt-6 max-w-xl text-[15px] leading-relaxed text-[var(--ink-dim)]">
            When pages disagree, someone must decide which source to believe. Here, no single server
            decides: every validator fetches every source itself, the panel agrees on what each one
            states, and the contract applies the policy in code. The record is the state — or
            unresolved, never a guess.
          </p>
          <div className="enter-up enter-up--3 mt-8 flex flex-wrap gap-3">
            <Link href="/create" className="btn btn--mint no-underline">
              Open a question <ArrowRight size={14} />
            </Link>
            <Link href="/dashboard" className="btn no-underline">
              Mission control
            </Link>
          </div>
          <div className="enter-up enter-up--4 mt-10 grid max-w-xl grid-cols-3 gap-6 border-t border-[var(--line)] pt-6">
            <Stat value={requests} label="Questions frozen" />
            <Stat value="2–6" label="Sources per request" />
            <Stat value={bonded} label="Bonds in custody" />
          </div>
        </div>

        {/* floating witness field */}
        <div className="relative hidden min-h-[460px] lg:block">
          <div className="absolute inset-0">
            <WitnessField />
          </div>
          <div className="absolute right-0 top-2 w-64">
            <LiveActivity />
          </div>
          <div className="absolute bottom-3 left-2 flex items-center gap-3">
            <span className="chip chip--live">
              <span className="dot" /> Live from the contract
            </span>
            <span className="label">StudioNet · read on every paint</span>
          </div>
        </div>
      </section>

      {/* ── firewall ─────────────────────────────────────────── */}
      <section className="mt-20">
        <p className="eyebrow">The firewall</p>
        <h2 className="display mt-3 text-3xl">Judgement is repeated. Decisions are code.</h2>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {FIREWALL.map((f) => (
            <Pane key={f.title}>
              <f.icon size={20} className="text-[var(--mint)]" />
              <p className="display mt-4 text-lg">{f.title}</p>
              <p className="mt-2 text-[13px] leading-relaxed text-[var(--ink-dim)]">{f.desc}</p>
            </Pane>
          ))}
        </div>
      </section>

      {/* ── policies ─────────────────────────────────────────── */}
      <section className="mt-20 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow">Reconciliation policies</p>
          <h2 className="display mt-3 text-3xl">Four ways to establish a state.</h2>
          <p className="mt-4 text-sm leading-relaxed text-[var(--ink-dim)]">
            Fixed at creation, applied identically on every validator. Sources are counted by
            publisher, not by URL: two pages of one publisher are one voice, a page that repeats
            another adds none, a missing page is not a contradiction, and stale evidence simply
            does not count.
          </p>
          <div className="mt-6 flex gap-3">
            <span className="chip chip--live">
              <span className="dot" /> Grounded claims only
            </span>
            <span className="chip">
              <span className="dot" /> UNRESOLVED, never a guess
            </span>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {POLICIES.map((p) => (
            <div key={p.name} className="pane p-5">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center border border-[rgba(53,213,180,0.35)] bg-[rgba(53,213,180,0.08)]">
                  <p.icon size={16} className="text-[var(--mint)]" />
                </span>
                <p className="display text-base">{p.name}</p>
              </div>
              <p className="mt-3 text-[13px] leading-relaxed text-[var(--ink-dim)]">{p.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── lifecycle ────────────────────────────────────────── */}
      <section className="mt-20">
        <p className="eyebrow">The lifecycle</p>
        <h2 className="display mt-3 text-3xl">From a bond to a record.</h2>
        <div className="pane mt-8 grid gap-0 md:grid-cols-5">
          {[
            { n: "01", t: "Freeze the terms", d: "Question, sources, answer form, policy, window, freshness, bond." },
            { n: "02", t: "Validators read", d: "Every node fetches every page itself; one isolated prompt per source." },
            { n: "03", t: "Consensus", d: "Readings must agree: claims, passages, dates, independence, outcome." },
            { n: "04", t: "Finality", d: "A five-minute contract delay, then the result becomes the state." },
            { n: "05", t: "Close & refund", d: "The window ends; the bond returns whole to its creator." },
          ].map((s, i) => (
            <div key={s.n} className={`p-6 ${i > 0 ? "border-t md:border-l md:border-t-0" : ""} border-[var(--line)]`}>
              <p className="mono text-[11px] tracking-[0.2em] text-[var(--mint)]">{s.n}</p>
              <p className="display mt-3 text-lg leading-tight">{s.t}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ink-dim)]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── mission control ──────────────────────────────────── */}
      <section className="mt-20">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="eyebrow">Mission control</p>
            <h2 className="display mt-3 text-3xl">Anyone may act. Nobody steers.</h2>
          </div>
          <Link href="/dashboard" className="btn no-underline">
            Enter the task hub <ArrowRight size={14} />
          </Link>
        </div>
        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ACTS.map((a, i) => (
            <div key={a.name} className="pane group p-5 transition-colors hover:border-[rgba(53,213,180,0.4)]">
              <div className="flex items-center justify-between">
                <a.icon size={18} className="text-[var(--mint)]" />
                <span className="mono text-[10px] text-[var(--muted)]">ACT {String(i + 1).padStart(2, "0")}</span>
              </div>
              <p className="display mt-4 text-base">{a.name}</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-[var(--ink-dim)]">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── final CTA ────────────────────────────────────────── */}
      <section className="mt-20">
        <div className="pane pane--raised relative overflow-hidden p-10 text-center">
          <NetworkBackgroundStandalone>
            <p className="eyebrow">Begin</p>
            <h2 className="display mx-auto mt-4 max-w-2xl text-[clamp(1.8rem,4vw,2.8rem)]">
              Freeze a question. Let the panel of validators read. Publish the record.
            </h2>
            <div className="mt-8 flex flex-wrap justify-center gap-3">
              <Link href="/create" className="btn btn--mint no-underline">
                Create an accord <ArrowRight size={14} />
              </Link>
              <Link href="/history" className="btn no-underline">
                Read the record
              </Link>
            </div>
            <p className="mono mt-6 text-[10.5px] tracking-[0.18em] text-[var(--muted)]">
              MetaMask or any injected wallet · StudioNet · bonds refund in full
            </p>
          </NetworkBackgroundStandalone>
        </div>
      </section>
    </div>
  );
}

type ActivityRow = { title: string; note: string; delta: string; mint: boolean; id?: string };

/** The activity stream on the hero: only what the contract has written —
 * finalized transitions first, then live requests, then bare protocol facts.
 * Nothing here is demo content. */
function LiveActivity() {
  const now = useNow(15000);
  const transitions = useTransitions(6);
  const accords = useAccords(null);

  let rows: ActivityRow[] = [];
  const inscriptions = [...(transitions.value?.items ?? [])].sort((a, b) => b.finalized_at - a.finalized_at);
  if (inscriptions.length) {
    rows = inscriptions.slice(0, 5).map((t) => ({
      title: `Accord #${t.accord_id}`,
      note: `${t.previous_state || "no prior state"} → ${t.new_state} · ${relativeTo(t.finalized_at, now)}`,
      delta: t.new_state,
      mint: t.kind !== "EXPIRED",
      id: t.accord_id,
    }));
  } else if (accords.value?.items.length) {
    rows = accords.value.items.slice(0, 5).map((a) => ({
      title: `Accord #${a.accord_id}`,
      note: `${a.terms.sources.length} sources · window ${a.observation_window_end > now ? `ends ${relativeTo(a.observation_window_end, now)}` : "closed"}`,
      delta: a.current_state || a.status,
      mint: Boolean(a.current_state),
      id: a.accord_id,
    }));
  } else {
    rows = [
      { title: "No requests yet", note: "the first accord begins the record", delta: "create", mint: true },
      { title: "Four policies", note: "majority · threshold · authority · strict", delta: "fixed", mint: true },
      { title: "Five-minute finality", note: "proposed, then final, then state", delta: "300 s", mint: true },
      { title: "Bonds never vote", note: "refunded in full when the window closes", delta: "GEN", mint: true },
    ];
  }

  return (
    <div className="space-y-2">
      {rows.map((f, i) => {
        const card = (
          <div
            className="pane enter-up flex items-center justify-between gap-3 px-3.5 py-2.5"
            style={{ animationDelay: `${0.15 + i * 0.09}s` }}
          >
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-[var(--ink)]">{f.title}</p>
              <p className="truncate text-[11px] text-[var(--muted)]">{f.note}</p>
            </div>
            <span
              className="mono shrink-0 text-[10px] uppercase tracking-wider"
              style={{ color: f.mint ? "var(--mint)" : "var(--amber)" }}
            >
              {f.delta}
            </span>
          </div>
        );
        return f.id ? (
          <Link key={i} href={`/accord/${f.id}`} className="block no-underline transition-transform hover:-translate-y-0.5">
            {card}
          </Link>
        ) : (
          <div key={i}>{card}</div>
        );
      })}
      {transitions.ready && (
        <p className="mono pt-1 text-right text-[9px] tracking-[0.18em] text-[var(--muted)]">
          WRITTEN BY THE CONTRACT · NOTHING CACHED
        </p>
      )}
    </div>
  );
}

function WitnessField() {
  const nodes = [
    { w: 54, top: "4%", left: "8%", d: "-1s" },
    { w: 34, top: "22%", left: "48%", d: "-3s" },
    { w: 44, top: "46%", left: "16%", d: "-5s" },
    { w: 30, top: "64%", left: "55%", d: "-2s" },
    { w: 40, top: "80%", left: "26%", d: "-4.5s" },
  ];
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 460">
      <path className="net-path" d="M40 40 C 120 120, 220 60, 300 130" transform="translate(0,10)" />
      <path className="net-path net-path--dim" d="M60 120 C 140 200, 240 160, 320 260" />
      <path className="net-path" d="M80 240 C 160 320, 240 280, 300 380" style={{ animationDuration: "11s" }} />
      {nodes.map((n, i) => (
        <foreignObject key={i} x={n.left.includes("%") ? 0 : 0} y={0} width="400" height="460">
          <span
            className="net-node"
            style={{ width: n.w, height: n.w, top: n.top, left: n.left, animationDelay: n.d, position: "absolute" }}
          />
        </foreignObject>
      ))}
    </svg>
  );
}

function NetworkBackgroundStandalone({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <svg className="h-full w-full" viewBox="0 0 800 300" preserveAspectRatio="none">
          <path className="net-path" d="M-20 80 C 180 40, 340 140, 560 70 S 760 30, 840 90" />
          <path className="net-path net-path--dim" d="M-20 220 C 200 260, 400 180, 620 230 S 800 260, 840 210" />
        </svg>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}
