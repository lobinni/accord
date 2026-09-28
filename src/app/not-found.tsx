import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="display mt-4 text-3xl">No record here.</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
        This address holds no page. The record hall lists everything the contract has established.
      </p>
      <Link href="/history" className="btn btn--mint mt-6 no-underline">
        <ArrowLeft size={13} /> The record
      </Link>
    </div>
  );
}
