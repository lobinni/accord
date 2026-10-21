#!/usr/bin/env python3
"""Warm the GenVM executor bundle cache (one-time, on a cold machine).

Direct-mode tests execute contracts/accord.py inside a local GenVM. The first
run downloads the executor bundle; this script performs that download so the
test run itself stays quiet and repeatable.

Usage:
    python scripts/fetch_genvm_bundle.py
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def main() -> int:
    if shutil.which("genvm-lint") is None:
        print("genvm-lint is not on PATH. Install the GenLayer test tooling first:", file=sys.stderr)
        print("  pip install genlayer-test", file=sys.stderr)
        return 2
    contract = ROOT / "contracts" / "accord.py"
    print(f"checking {contract.relative_to(ROOT)} (this downloads the bundle on a cold cache)…")
    out = subprocess.run(["genvm-lint", "check", str(contract), "--json"], capture_output=True, text=True)
    sys.stdout.write(out.stdout)
    if out.returncode != 0:
        sys.stderr.write(out.stderr)
        return out.returncode
    print("bundle cached; contract passes genvm-lint.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
