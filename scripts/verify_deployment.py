#!/usr/bin/env python3
"""Verify an ACCORD deployment from the chain alone.

Pulls the contract code stored at the given address on StudioNet, compares its
hash to the local contracts/accord.py, and prints the live protocol info.

Usage:
    python scripts/verify_deployment.py 0xContractAddress
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RPC_URL = os.environ.get("GENLAYER_RPC_URL", "https://studio.genlayer.com/api")


def rpc(method: str, params: list) -> dict:
    import requests

    resp = requests.post(RPC_URL, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, timeout=30)
    resp.raise_for_status()
    out = resp.json()
    if "error" in out:
        raise RuntimeError(f"{method}: {out['error']}")
    return out["result"]


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].startswith("0x"):
        print("usage: python scripts/verify_deployment.py 0xContractAddress", file=sys.stderr)
        return 2
    address = sys.argv[1]
    local = (ROOT / "contracts" / "accord.py").read_text(encoding="utf-8")
    local_digest = hashlib.sha256(local.encode()).hexdigest()

    stored = rpc("gen_getContractCode", [address])
    stored_text = stored if isinstance(stored, str) else stored.get("code", "")
    stored_digest = hashlib.sha256(stored_text.encode()).hexdigest()

    print(f"address      : {address}")
    print(f"local sha256 : {local_digest}")
    print(f"chain sha256 : {stored_digest}")
    if stored_digest != local_digest:
        print("result       : MISMATCH — the stored code is not this repository's contract.")
        return 1
    print("result       : byte-identical to contracts/accord.py")

    try:
        from genlayer_py import create_client  # type: ignore
        from genlayer_py.chains import studionet  # type: ignore

        client = create_client(chain=studionet)
        info = client.read_contract(address=address, function_name="get_protocol_info", args=[])
        pretty = {k: info[k] for k in ("protocol_version", "accord_count", "total_bonded") if k in info}
        print(f"protocol     : {json.dumps(pretty)}")
    except Exception as exc:  # protocol info is informational only
        print(f"protocol     : read skipped ({exc})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
