"use client";

import { RefreshCw } from "lucide-react";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <p className="eyebrow">Something interrupted the page</p>
      <h1 className="display mt-4 text-3xl">The network blinked.</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
        Nothing was written and nothing was lost — the contract holds the state, this page only
        reads it. Try again.
      </p>
      <button className="btn btn--mint mt-6" onClick={reset}>
        <RefreshCw size={13} /> Retry
      </button>
    </div>
  );
}
