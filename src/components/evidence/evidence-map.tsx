"use client";

/**
 * The evidence map: one card per source showing what the panel agreed the
 * source stated — its claim and the exact passage that states it, freshness,
 * dates and whether it republishes another source. All fields are agreed
 * values from the contract; quotes render as prose, never as markup.
 */

import { CalendarClock, FileText, Link2, Repeat2 } from "lucide-react";

import type { EvidenceRow } from "@/lib/genlayer/contract";
import { formatDateTime } from "@/lib/formatting/present";
import { EvidenceChip, FreshnessChip } from "@/components/accord/chips";

export function EvidenceMap({ evidence }: { evidence: EvidenceRow[] }) {
  if (!evidence.length) return null;
  return (
    <ul className="grid gap-4 md:grid-cols-2">
      {evidence.map((row) => (
        <li key={row.source_id} className="pane flex flex-col p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="mono text-[10px] tracking-[0.2em] text-[var(--muted)]">{row.source_id} · {row.origin}</p>
              <p className="mt-1 truncate text-sm font-semibold text-[var(--ink)]">{hostLabel(row.source_url)}</p>
            </div>
            <EvidenceChip status={row.evidence_status} />
          </div>

          {row.claim ? (
            <blockquote className="mt-3 border-l-2 border-[rgba(53,213,180,0.45)] pl-3">
              <p className="text-[13px] leading-relaxed text-[var(--ink-dim)]">“{row.claim}”</p>
            </blockquote>
          ) : (
            <p className="mt-3 flex items-center gap-2 text-[13px] text-[var(--muted)]">
              <FileText size={13} />
              {row.availability === "AVAILABLE" ? "The page does not answer the question." : "The page could not be read."}
            </p>
          )}

          <div className="mt-4 space-y-1.5 border-t border-[var(--line)] pt-3">
            {row.claim_value !== "NONE" && (
              <p className="flex items-center justify-between text-[12px]">
                <span className="label">States</span>
                <span className="mono text-[12px] font-semibold text-[var(--mint)]">{row.claim_value}</span>
              </p>
            )}
            <p className="flex items-center justify-between text-[12px]">
              <span className="label">Freshness</span>
              <FreshnessChip freshness={row.freshness} />
            </p>
            {row.published_at && (
              <p className="flex items-center justify-between text-[12px]">
                <span className="label">Dated</span>
                <span className="flex items-center gap-1.5 text-[var(--ink-dim)]">
                  <CalendarClock size={12} /> {row.published_at}
                </span>
              </p>
            )}
            <p className="flex items-center justify-between text-[12px]">
              <span className="label">Observed</span>
              <span className="text-[var(--ink-dim)]">{formatDateTime(row.retrieved_at)}</span>
            </p>
            {row.derived_from && (
              <p className="flex items-center justify-between text-[12px]">
                <span className="label">Republishes</span>
                <span className="flex items-center gap-1.5 text-[var(--amber)]">
                  <Repeat2 size={12} /> {row.derived_from} — adds no voice
                </span>
              </p>
            )}
          </div>

          <a
            href={row.source_url}
            target="_blank"
            rel="noreferrer"
            className="mono mt-4 inline-flex items-center gap-2 text-[10.5px] tracking-wide text-[var(--mint)] hover:underline"
          >
            <Link2 size={12} /> Visit the source
          </a>
        </li>
      ))}
    </ul>
  );
}

function hostLabel(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
}
