"""Bond behaviour, live: refused creations return deposits, refunds pay once."""

from __future__ import annotations

import json
import time

import pytest

from .conftest import ADDRESS, wait_finality


def test_refused_creation_returns_the_deposit_with_a_reason(live_client, record):
    client, account = live_client
    if account is None:
        pytest.skip("no funded account configured")
    now = int(time.time())
    bad_terms = json.dumps({
        "sources": [{"url": "https://only-one.example.com/", "label": "", "declared_class": "UNKNOWN"}],
        "result_type": {"kind": "BOOLEAN"},
        "policy": {"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2},
        "observation_window_start": now + 60,
        "observation_window_end": now + 60 + 86_400,
        "freshness_requirement": 0,
        "validity_seconds": 86_400,
    })
    bond = 10**15
    tx = client.write_contract(
        address=ADDRESS, function_name="create_accord",
        args=["Bad request", bad_terms, bond], value=bond,
    )
    wait_finality(client, tx)
    returned = client.read_contract(address=ADDRESS, function_name="returned_for", args=[account.address, 0, 10])
    assert any("between 2 and 6" in item["reason"] for item in returned["items"])
    record.append({
        "case": "refused_creation_returns_deposit",
        "accord_id": "",
        "outcome": "RETURNED",
        "transactions": [{"kind": "create_refused", "hash": tx}],
        "bond_refunded": True,
    })
