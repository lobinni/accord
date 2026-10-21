import Link from "next/link";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3 no-underline">
      <svg width="34" height="34" viewBox="0 0 64 64" aria-hidden>
        <rect width="64" height="64" fill="none" />
        <path d="M14 44 L26 20 L32 30 L40 16 L50 44" fill="none" stroke="#35d5b4" strokeWidth="3.4" />
        <circle cx="26" cy="20" r="4" fill="#fbfcf9" />
        <circle cx="40" cy="16" r="4" fill="#35d5b4" />
        <circle cx="14" cy="44" r="4" fill="#35d5b4" />
        <circle cx="50" cy="44" r="4" fill="#fbfcf9" />
        <path d="M18 49 H46" stroke="#35d5b4" strokeWidth="2" strokeDasharray="4 4" />
      </svg>
      {!compact && (
        <span className="display text-xl tracking-wide text-[var(--ink)]">
          ACCORD
          <span className="label ml-2 hidden sm:inline">reconciliation protocol</span>
        </span>
      )}
    </Link>
  );
}
