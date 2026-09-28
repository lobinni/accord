import { Loader2 } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center gap-3 py-24 text-[var(--muted)]">
      <Loader2 className="spin" size={16} />
      <span className="text-sm">Listening to StudioNet…</span>
    </div>
  );
}
