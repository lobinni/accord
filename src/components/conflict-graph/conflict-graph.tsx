"use client";

/**
 * The conflict graph: independence groups as nodes in a ring, each speaking
 * once with its agreed claim; supporting bonds in mint, contradictions in
 * ember. Derived sources hang off the group they repeat.
 */

import { useMemo } from "react";

import type { GroupRecord, ResultRecord } from "@/lib/genlayer/contract";

const MINT = "#35d5b4";
const AMBER = "#f0a74b";
const DIM = "#65706b";
const LINE = "rgba(251,252,249,0.14)";

export function ConflictGraph({ result }: { result: ResultRecord }) {
  const groups = result.groups;
  const layout = useMemo(() => {
    const n = Math.max(groups.length, 1);
    const cx = 220;
    const cy = 190;
    const r = n > 1 ? 120 : 0;
    return groups.map((g, i) => {
      const angle = (2 * Math.PI * i) / n - Math.PI / 2;
      return { g, x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }, [groups]);

  if (!groups.length) {
    return <p className="py-4 text-sm text-[var(--muted)]">No qualifying groups formed in this observation.</p>;
  }

  const claimOf = new Map(groups.map((g) => [g.group, g.claim]));
  const nodes = layout;

  return (
    <div className="w-full overflow-x-auto scroll-thin">
      <svg viewBox="0 0 440 380" className="mx-auto min-w-[420px] max-w-full">
        {/* edges between groups with differing claims */}
        {nodes.map((a, i) =>
          nodes.map((b, j) => {
            if (j <= i) return null;
            const same = a.g.claim === b.g.claim && a.g.claim !== "";
            return (
              <line
                key={`${i}-${j}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                stroke={same ? "rgba(53,213,180,0.35)" : "rgba(240,167,75,0.3)"}
                strokeWidth={same ? 2 : 1.2}
                strokeDasharray={same ? "none" : "4 5"}
              />
            );
          }),
        )}
        {nodes.map(({ g, x, y }, i) => {
          const supports = result.supporting_sources.some((s) => g.source_ids.includes(s));
          const color = supports ? MINT : g.claim ? AMBER : DIM;
          return (
            <g key={i}>
              <rect x={x - 46} y={y - 30} width={92} height={60} fill="#0b1613" stroke={color} strokeWidth={1.2} />
              <text x={x} y={y - 8} textAnchor="middle" fill={color} fontSize={11} fontFamily="var(--font-dm-mono)">
                {g.source_ids.join(" + ")}
              </text>
              <text x={x} y={y + 8} textAnchor="middle" fill="#fbfcf9" fontSize={10.5} fontWeight={600}>
                {truncate(g.claim || "no say", 12)}
              </text>
              <text x={x} y={y + 22} textAnchor="middle" fill={DIM} fontSize={8.5} fontFamily="var(--font-dm-mono)">
                {truncate(g.group, 18)}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="mt-2 flex flex-wrap justify-center gap-4">
        <Legend color={MINT} solid label="Voices behind the state" />
        <Legend color={AMBER} label="A differing, counted voice" />
        <Legend color={DIM} label="Counted, but unresolved" />
      </div>
    </div>
  );
}

function Legend({ color, label, solid = false }: { color: string; label: string; solid?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <svg width="22" height="2">
        <line x1="0" y1="1" x2="22" y2="1" stroke={solid ? "rgba(53,213,180,0.5)" : color} strokeWidth="2" strokeDasharray={solid ? "none" : "3 4"} />
      </svg>
      <span className="label">{label}</span>
    </span>
  );
}

function truncate(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s;
}
