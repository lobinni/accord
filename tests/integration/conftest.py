"""Live StudioNet suite.

Skipped by default. Run about 40 minutes against a deployed contract:

    SKIP_INTEGRATION=0 ACCORD_CONTRACT=0xAddress python -m pytest tests/integration -v -s

The suite creates real requests with small bonds, observes real pages, and
refunds every bond at the end of a case. It records everything to
docs/live-e2e.json for scripts/render_e2e.py.
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
RECORD = ROOT / "docs" / "live-e2e.json"

SKIP = os.environ.get("SKIP_INTEGRATION", "1") != "0"
ADDRESS = os.environ.get("ACCORD_CONTRACT", "")

pytestmark = pytest.mark.skipif(SKIP or not ADDRESS.startswith("0x"),
                                reason="set SKIP_INTEGRATION=0 and ACCORD_CONTRACT to run live")


@pytest.fixture(scope="session")
def live_client():
    from genlayer_py import create_account, create_client  # type: ignore
    from genlayer_py.chains import studionet  # type: ignore

    key = os.environ.get("ACCORD_DEPLOYER_KEY", "") or os.environ.get("GENLAYER_PRIVATE_KEY", "")
    account = create_account(key) if key else None
    client = create_client(chain=studionet, account=account)
    return client, account


@pytest.fixture(scope="session")
def record():
    entries = []
    yield entries
    RECORD.write_text(json.dumps(entries, indent=2) + "\n", encoding="utf-8")
    print(f"\nwrote {RECORD}")


def wait_finality(client, tx_hash: str, timeout: int = 900) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        receipt = client.wait_for_transaction_receipt(hash=tx_hash, status="FINALIZED", retries=1, interval=5)
        if receipt:
            return receipt
    raise TimeoutError(tx_hash)
