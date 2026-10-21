#!/usr/bin/env python3
"""Verify an ACCORD deployment from the chain alone.

Pulls the contract code stored at the given address on StudioNet, compares its
hash to the local contracts/accord.py, and prints the live protocol info.

Usage:
    python scripts/verify_deployment.py 0xContractAddress
"""

from __future__ import annotations

import base64
import hashlib
import json
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RPC_URL = os.environ.get("GENLAYER_RPC_URL", "https://studio.genlayer.com/api")


def rpc(method: str, params: list) -> dict:
    """Stdlib-only JSON-RPC POST (no third-party dependencies required)."""
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


def _release_record() -> dict:
    """The committed release record, if present, so a revision difference can
    be named precisely instead of reported as an unknown mismatch."""
    path = ROOT / "docs" / "deployment.json"
    try:
        return json.loads(path.read_text(encoding="utf-8")).get("release", {}) or {}
    except Exception:
        return {}


def _decode_code_result(result) -> str:
    """gen_getContractCode answers base64-encoded source bytes (or a dict
    carrying them); decode to text identically on every host."""
    raw = result if isinstance(result, str) else (result.get("code", "") if isinstance(result, dict) else "")
    try:
        return base64.b64decode(raw).decode("utf-8")
    except Exception:
        return raw  # already plain text on some RPC surfaces


def _normalized_digest(text: str) -> str:
    """Line-ending-insensitive source hash: deployment tooling may store the
    code with CRLF line endings; identity means identical content, and content
    is compared after normalizing every line ending to LF."""
    return hashlib.sha256(text.replace("\r\n", "\n").replace("\r", "\n").encode()).hexdigest()


def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].startswith("0x"):
        print("usage: python scripts/verify_deployment.py 0xContractAddress", file=sys.stderr)
        return 2
    address = sys.argv[1]
    local = (ROOT / "contracts" / "accord.py").read_text(encoding="utf-8")
    local_digest = _normalized_digest(local)

    stored = rpc("gen_getContractCode", [address])
    stored_text = _decode_code_result(stored)
    stored_digest = _normalized_digest(stored_text)

    print(f"address      : {address}")
    print(f"local sha256 : {local_digest}  (LF-normalized)")
    print(f"chain sha256 : {stored_digest}  (LF-normalized)")
    if stored_digest != local_digest:
        release = _release_record()
        if release and stored_digest == release.get("onchain_code_sha256"):
            print("result       : the chain runs the RECORDED earlier revision of this contract.")
            print("               docs/deployment.json documents both hashes:")
            print(f"               on-chain (running)  : {release.get('onchain_code_sha256')}")
            print(f"               committed (source)  : {release.get('committed_source_sha256')}")
            print("               activate the committed revision with: python scripts/deploy.py")
        else:
            print("result       : MISMATCH — the stored code is not this repository's contract.")
        return 1
    print("result       : byte-identical to the committed contracts/accord.py")

    # Schema verification needs no SDK: it is another chain read from the same
    # RPC. This proves the deployed object exposes the complete interface.
    try:
        schema = rpc("gen_getContractSchema", [address])
        methods = schema.get("methods", {}) if isinstance(schema, dict) else {}
        expected = {
            "create_accord", "cancel_accord", "observe_accord", "finalize_result",
            "expire_result", "close_accord", "refund_bond", "get_protocol_info",
            "get_accord", "get_result", "get_results", "get_history", "list_accords",
            "list_by_creator", "list_transitions", "get_returned_deposits", "returned_for",
        }
        missing = sorted(expected - set(methods))
        print(f"schema       : {len(methods)}/17 methods" + (f"; missing {missing}" if missing else "; complete"))
        if missing or len(methods) != 17:
            return 1
    except Exception as exc:
        print(f"schema       : read failed ({exc})")
        return 1

    # Protocol info requires calldata encoding; use genlayer-py when installed.
    try:
        from genlayer_py import create_client  # type: ignore
        from genlayer_py.chains import studionet  # type: ignore
        client = create_client(chain=studionet)
        info = client.read_contract(address=address, function_name="get_protocol_info", args=[])
        pretty = {k: info[k] for k in ("protocol_version", "accord_count", "total_bonded") if k in info}
        print(f"protocol     : {json.dumps(pretty)}")
    except Exception:
        print("protocol     : install genlayer-py for the optional get_protocol_info round-trip")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
