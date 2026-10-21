#!/usr/bin/env python3
"""Execute ONE complete accord lifecycle on StudioNet and record every
transaction: create -> observe -> finalize -> close -> refund, plus the final
accounting readback.

The record is appended to docs/live-e2e.json (created if absent), which
docs/e2e.md renders. Nothing is invented: every row carries the transaction
hash as the network reported it, the consensus outcome as the chain recorded
it, and the accounting as the contract's own views answer afterwards.

Usage:
    ACCORD_DEPLOYER_KEY=<funded test key> python scripts/lifecycle_e2e.py \
        [--question "..."] [--bond 0.02] [--window-seconds 172800]

Prerequisites:
    pip install genlayer-py
    export ACCORD_DEPLOYER_KEY=<key with StudioNet GEN>
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RECORD = ROOT / "docs" / "live-e2e.json"
ADDRESS = os.environ.get("ACCORD_CONTRACT", "").strip()
RPC_URL = os.environ.get("GENLAYER_RPC_URL", "https://studio.genlayer.com/api")
BOND_DEFAULT = 2 * 10 ** 16                      # 0.02 GEN
WINDOW_DEFAULT = 900                             # 15 minutes; contract minimum is 10
FINALITY_DELAY = 300                             # the contract's own gate


def rpc(method: str, params: list):
    """Stdlib-only JSON-RPC POST."""
    from urllib import request as urlrequest

    payload = json.dumps({"jsonrpc": "2.0", "id": 1, "method": method, "params": params}).encode()
    req = urlrequest.Request(RPC_URL, data=payload, headers={
        "content-type": "application/json",
        "user-agent": "ACCORD-GenLayer/1.0",
        "accept": "application/json",
    })
    with urlrequest.urlopen(req, timeout=30) as resp:
        out = json.loads(resp.read().decode())
    if "error" in out:
        raise RuntimeError(f"{method}: {out['error']}")
    return out["result"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--question", default="Is the GenLayer StudioNet documentation site reachable and reporting itself online?")
    ap.add_argument("--bond", default="0.02")
    ap.add_argument("--window-seconds", type=int, default=WINDOW_DEFAULT)
    args = ap.parse_args()

    key = os.environ.get("ACCORD_DEPLOYER_KEY", "").strip()
    if not key:
        print("ACCORD_DEPLOYER_KEY is not set; export a funded StudioNet test key and retry.", file=sys.stderr)
        return 2
    address = ADDRESS
    if not address.startswith("0x"):
        print("ACCORD_CONTRACT=0xAddress is required (or set it in the environment).", file=sys.stderr)
        return 2

    try:
        from genlayer_py import create_account, create_client  # type: ignore
        from genlayer_py.chains import studionet  # type: ignore
    except Exception:
        print("pip install genlayer-py first.", file=sys.stderr)
        return 2

    account = create_account(key)
    client = create_client(chain=studionet, account=account)
    print(f"contract : {address}")
    print(f"account  : {account.address}")

    bond_atto = str(int(round(float(args.bond) * 10 ** 18)))
    now = int(time.time())
    terms = json.dumps({
        "sources": [
            {"url": "https://docs.genlayer.com/", "label": "Protocol documentation", "declared_class": "OFFICIAL"},
            {"url": "https://genlayer.foundation/", "label": "Foundation page", "declared_class": "INDEPENDENT"},
            {"url": "https://github.com/genlayerlabs", "label": "Engineering organization", "declared_class": "INDEPENDENT"},
        ],
        "result_type": {"kind": "CATEGORICAL", "values": ["ONLINE", "UNREACHABLE", "BROKEN"]},
        "policy": {"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2},
        "observation_window_start": now + 60,
        "observation_window_end": now + 60 + args.window_seconds,
        "freshness_requirement": 0,
        "validity_seconds": args.window_seconds,
    })

    entry: dict = {
        "case": "complete_lifecycle_close_and_refund",
        "accord_id": None,
        "outcome": None,
        "bond_refunded": False,
        "transactions": [],
        "accounting": {},
        "executed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    def record(kind: str, tx_hash: str, extra: dict | None = None) -> None:
        row = {"kind": kind, "hash": tx_hash}
        if extra:
            row.update(extra)
        entry["transactions"].append(row)
        print(f"  {kind:<10} {tx_hash}")

    def wait_final(tx_hash: str) -> dict:
        deadline = time.time() + 900
        while time.time() < deadline:
            try:
                tx = client.get_transaction_by_hash(tx_hash)
                status = str(getattr(tx, "status", "") or "")
                if status.upper() in ("FINALIZED", "ACCEPTED", "READY_TO_FINALIZE"):
                    return tx
            except Exception:
                pass
            time.sleep(6)
        raise TimeoutError(f"{tx_hash} did not finalize")

    # 1. create (bond attached as the transaction value)
    tx = client.write_contract(address=address, function_name="create_accord",
                               args=[args.question, terms, int(bond_atto)], value=int(bond_atto))
    wait_final(tx)
    record("create", tx)
    info = client.read_contract(address=address, function_name="get_protocol_info", args=[])
    accord_id = str(info["accord_count"])
    entry["accord_id"] = accord_id
    print(f"  created accord #{accord_id}")

    # 2. observe (wait for the window to open)
    time.sleep(75)
    tx = client.write_contract(address=address, function_name="observe_accord", args=[accord_id])
    wait_final(tx)
    record("observe", tx)

    # 3. finalize after the contract's own finality delay
    print(f"  waiting out the {FINALITY_DELAY}s finality delay…")
    time.sleep(FINALITY_DELAY + 30)
    tx = client.write_contract(address=address, function_name="finalize_result", args=[accord_id])
    wait_final(tx)
    record("finalize", tx)

    # 4. close — only after the frozen observation window has ended
    wait_to_close = max(0, window_end - int(time.time()) + 2)
    if wait_to_close:
        print(f"  waiting {wait_to_close}s for the observation window to close…")
        time.sleep(wait_to_close)
    tx = client.write_contract(address=address, function_name="close_accord", args=[accord_id])
    wait_final(tx)
    record("close", tx)

    # 5. refund
    tx = client.write_contract(address=address, function_name="refund_bond", args=[accord_id])
    wait_final(tx)
    record("refund", tx)

    # 6. accounting readback from the contract's own views
    accord = client.read_contract(address=address, function_name="get_accord", args=[accord_id])
    result = client.read_contract(address=address, function_name="get_result",
                                  args=[accord["latest_result_id"]]) if accord.get("latest_result_id") else None
    entry["accounting"] = {
        "status": accord["status"],
        "current_state": accord.get("current_state", ""),
        "bond_status": accord["bond_status"],
        "bond_deposited": str(accord.get("bond_deposited", "0")),
        "refunded_amount": str(accord.get("refunded_amount", "0")),
        "reconciliation_status": (result or {}).get("reconciliation_status", ""),
        "recorded_state": (result or {}).get("state", ""),
        "supporting_sources": (result or {}).get("supporting_sources", []),
        "conflicting_sources": (result or {}).get("conflicting_sources", []),
        "history_entries": len(client.read_contract(address=address, function_name="get_history",
                                                    args=[accord_id, 0, 50]).get("items", [])),
    }
    entry["outcome"] = entry["accounting"]["current_state"] or entry["accounting"]["reconciliation_status"]
    entry["bond_refunded"] = entry["accounting"]["bond_status"] == "REFUNDED" \
        and int(entry["accounting"]["refunded_amount"]) == int(bond_atto)
    print(json.dumps(entry["accounting"], indent=2))

    rows = json.loads(RECORD.read_text(encoding="utf-8")) if RECORD.exists() else []
    rows.append(entry)
    RECORD.write_text(json.dumps(rows, indent=2) + "\n", encoding="utf-8")
    print(f"\nrecorded : {RECORD.relative_to(ROOT)}")
    print("next     : python scripts/render_e2e.py   # regenerates docs/e2e.md")
    return 0 if entry["bond_refunded"] else 1


if __name__ == "__main__":
    raise SystemExit(main())
