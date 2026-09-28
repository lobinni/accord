#!/usr/bin/env python3
"""Render docs/e2e.md from the recorded live run in docs/live-e2e.json."""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECORD = ROOT / "docs" / "live-e2e.json"
OUT = ROOT / "docs" / "e2e.md"

HEADER = """# ACCORD — End-to-end record

Generated from `docs/live-e2e.json` by `python scripts/render_e2e.py`.

"""


def main() -> int:
    if not RECORD.exists():
        print("docs/live-e2e.json does not exist; run the integration suite first.")
        return 2
    cases = json.loads(RECORD.read_text(encoding="utf-8"))
    lines = [HEADER, f"Executed cases: {len(cases)}.\n", "| Case | Outcome | Transactions | Bond refunded |",
             "| ---- | ------- | ------------ | ------------- |"]
    for c in cases:
        txs = ", ".join(t.get("kind", "?") for t in c.get("transactions", []))
        lines.append(f"| {c.get('case', '?')} | {c.get('outcome', '?')} | {txs} | "
                     f"{'yes' if c.get('bond_refunded') else 'no'} |")
    lines.append("\nFull record: `docs/live-e2e.json`.")
    OUT.write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(f"wrote {OUT.relative_to(ROOT)} for {len(cases)} cases")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
