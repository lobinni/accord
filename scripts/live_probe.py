#!/usr/bin/env python3
"""Probe a live ACCORD contract's read surface on StudioNet.

Usage:
    ACCORD_CONTRACT=0xAddress python scripts/live_probe.py
"""

from __future__ import annotations

import json
import os
import sys


def main() -> int:
    address = os.environ.get("ACCORD_CONTRACT", "").strip()
    if not address.startswith("0x"):
        print("ACCORD_CONTRACT=0xAddress is required", file=sys.stderr)
        return 2
    try:
        from genlayer_py import create_client  # type: ignore
        from genlayer_py.chains import studionet  # type: ignore
    except Exception:
        print("pip install genlayer-py first", file=sys.stderr)
        return 2

    client = create_client(chain=studionet)
    info = client.read_contract(address=address, function_name="get_protocol_info", args=[])
    print("protocol :", info.get("protocol_version"))
    print("requests :", info.get("accord_count"), "| bonded:", info.get("total_bonded"),
          "| transitions:", info.get("transition_count"))
    page = client.read_contract(address=address, function_name="list_accords", args=[0, 10])
    for item in page.get("items", []):
        print(f"  #{item['accord_id']:>3} {item['status']:<10} {item['question'][:70]}")
    print(json.dumps({"total": page.get("total")}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
