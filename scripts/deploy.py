#!/usr/bin/env python3
"""Deploy the ACCORD intelligent contract to GenLayer StudioNet (chain 61999).

Reads a deployer key from the ACCORD_DEPLOYER_KEY environment variable, sends
the deployment, waits for GenLayer finality, then proves the code stored on
chain is byte-identical to the local file before writing docs/deployment.json.

Usage:
    ACCORD_DEPLOYER_KEY=<key> python scripts/deploy.py
"""

from __future__ import annotations

import hashlib
import json
import os
import sys
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CONTRACT = ROOT / "contracts" / "accord.py"
DEPLOYMENT = ROOT / "docs" / "deployment.json"
RPC_URL = os.environ.get("GENLAYER_RPC_URL", "https://studio.genlayer.com/api")
CHAIN_ID = 61999


def rpc(method: str, params: list) -> dict:
    import requests

    resp = requests.post(RPC_URL, json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params}, timeout=30)
    resp.raise_for_status()
    out = resp.json()
    if "error" in out:
        raise RuntimeError(f"{method}: {out['error']}")
    return out["result"]


def wait_finalized(tx_hash: str, timeout: int = 900) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        tx = rpc("eth_getTransactionByHash", [tx_hash])
        if tx and str(tx.get("status", "")).upper() in ("FINALIZED", "ACCEPTED"):
            return tx
        time.sleep(5)
    raise TimeoutError(f"transaction {tx_hash} not finalized within {timeout}s")


def main() -> int:
    key = os.environ.get("ACCORD_DEPLOYER_KEY", "").strip()
    if not key:
        print("ACCORD_DEPLOYER_KEY is not set; export it in this shell and retry.", file=sys.stderr)
        return 2
    code = CONTRACT.read_text(encoding="utf-8")
    digest = hashlib.sha256(code.encode()).hexdigest()
    print(f"contract : {CONTRACT.relative_to(ROOT)} ({len(code)} bytes, sha256 {digest[:16]}…)")
    print(f"network  : studionet chain {CHAIN_ID} via {RPC_URL}")

    # Deployment path via genlayer-py when available, else manual guidance.
    try:
        from genlayer_py import create_account, create_client  # type: ignore
        from genlayer_py.chains import studionet  # type: ignore
    except Exception:
        print("genlayer-py is not installed. pip install genlayer-py, then retry.", file=sys.stderr)
        return 2

    account = create_account(key)
    client = create_client(chain=studionet, account=account)
    print(f"deployer : {account.address}")

    with open(CONTRACT, "rb") as fh:
        tx_hash = client.deploy_contract(code=fh.read(), args=[])
    print(f"deploy tx: {tx_hash}")
    wait_finalized(tx_hash)

    address = client.get_contract_address(tx_hash)
    print(f"address  : {address}")

    # Prove the stored code is byte-identical to the local file.
    stored = rpc("gen_getContractCode", [address])
    stored_text = stored if isinstance(stored, str) else stored.get("code", "")
    stored_digest = hashlib.sha256(stored_text.encode()).hexdigest()
    if stored_digest != digest:
        print("ERROR: on-chain code hash differs from the local file; refusing to record.", file=sys.stderr)
        return 1
    print("verify   : on-chain code is byte-identical to contracts/accord.py")

    record = {
        "network": "studionet",
        "chain_id": CHAIN_ID,
        "rpc_url": RPC_URL,
        "explorer": "https://explorer-studio.genlayer.com",
        "protocol_version": "ACCORD-1.0.0",
        "contract": {
            "file": "contracts/accord.py",
            "address": address,
            "deploy_transaction": tx_hash,
            "code_sha256": digest,
            "deployed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "verified byte-identical",
        },
        "notes": [
            "Set ACCORD_CONTRACT to this address in .env and restart the interface.",
            "Re-verify any time: python scripts/verify_deployment.py <address>",
        ],
    }
    DEPLOYMENT.write_text(json.dumps(record, indent=2) + "\n", encoding="utf-8")
    print(f"recorded : {DEPLOYMENT.relative_to(ROOT)}")
    print(f"next     : set ACCORD_CONTRACT={address} in .env")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
