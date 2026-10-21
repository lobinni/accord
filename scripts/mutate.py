#!/usr/bin/env python3
"""Mutation sweep over contracts/accord.py.

Each mutation applies one focused change to a copy of the contract, runs the
direct-mode suite against it, and must fail. A mutant that survives exposes a
hole in the tests. Mutants live under .mutants/ and never touch the source.

Usage:
    python scripts/mutate.py            # the whole sweep
    python scripts/mutate.py --only 3   # one mutant, for debugging
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / "contracts" / "accord.py"
WORK = ROOT / ".mutants"

MUTANTS = [
    ("majority_without_half", r"backing \* 2 > n_groups", "backing * 2 >= n_groups"),
    ("threshold_strict_half", r"not BPS // 2 < bps", "not BPS // 2 <= bps"),
    ("refund_twice", r"if r\.bond_status == B_REFUNDED:", "if False:"),
    ("quote_len_too_short", r"MIN_QUOTE <= len\(quote\)", "1 <= len(quote)"),
    ("stale_becomes_current", r'r\["freshness"\] = F_STALE', 'r["freshness"] = F_CURRENT'),
    ("no_finality_delay", r"\+ FINALITY_DELAY_SECONDS", "+ 0"),
    ("origin_by_url", r'group_of\[r\["source_id"\]\] = root\["origin"\]', 'group_of[r["source_id"]] = r["source_url"]'),
    ("skip_grounding", r"and _claim_grounded\(value, quote, rtype\)", ""),
    ("window_open_ignored", r"if now < int\(r\.observation_window_start\):", "if False:"),
    ("bond_min_raised", r"MIN_BOND = 10 \*\* 15", "MIN_BOND = 10 ** 18"),
]


def run_suite(env) -> int:
    return subprocess.run(
        [sys.executable, "-m", "pytest", "tests/direct", "-q", "-x"],
        cwd=ROOT, env=env, capture_output=True, text=True,
    ).returncode


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", type=int, default=None)
    args = ap.parse_args()

    source = SOURCE.read_text(encoding="utf-8")
    WORK.mkdir(exist_ok=True)
    baseline = run_suite(None)
    if baseline != 0:
        print("baseline suite fails; fix the contract before mutating.", file=sys.stderr)
        return 2

    killed, survived = 0, []
    for i, (name, pattern, replacement) in enumerate(MUTANTS):
        if args.only is not None and i != args.only:
            continue
        mutant_path = WORK / f"accord_{name}.py"
        text, count = re.subn(pattern, replacement, source, count=1)
        if count == 0:
            print(f"[{i}] {name}: pattern not found — mutant definition is stale", file=sys.stderr)
            survived.append(name)
            continue
        mutant_path.write_text(text, encoding="utf-8")
        import os

        env = dict(os.environ, ACCORD_CONTRACT_OVERRIDE=str(mutant_path))
        if run_suite(env) != 0:
            killed += 1
            print(f"[{i}] {name}: killed")
        else:
            survived.append(name)
            print(f"[{i}] {name}: SURVIVED — the suite does not catch this change")

    print(f"\n{killed} killed, {len(survived)} survived: {', '.join(survived) or '—'}")
    return 1 if survived else 0


if __name__ == "__main__":
    raise SystemExit(main())
