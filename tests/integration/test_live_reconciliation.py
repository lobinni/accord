"""The flagship cases, live on StudioNet. See docs/e2e.md for the full table."""

from __future__ import annotations

import json
import os
import time

import pytest

from .conftest import ADDRESS, wait_finality

BOND = 2 * 10**16  # 0.02 GEN

URLS = {
    "conflicting": "https://raw.githubusercontent.com/example/accord-demo/main/conflicting-report.md",
    "derived": "https://raw.githubusercontent.com/example/accord-demo/main/derived-report.md",
    "official": "https://raw.githubusercontent.com/example/accord-demo/main/official-status.md",
}


def terms(sources, policy, window_seconds=172_800):
    now = int(time.time())
    return json.dumps({
        "sources": sources,
        "result_type": {"kind": "CATEGORICAL", "values": ["OPERATIONAL", "DEGRADED", "DOWN"]},
        "policy": policy,
        "observation_window_start": now + 30,
        "observation_window_end": now + 30 + window_seconds,
        "freshness_requirement": 30 * 86_400,
        "validity_seconds": window_seconds,
    })


def create_accord(client, account, question, sources, policy):
    tx = client.write_contract(
        address=ADDRESS, function_name="create_accord",
        args=[question, terms(sources, policy), BOND], value=BOND,
    )
    wait_finality(client, tx)
    page = client.read_contract(address=ADDRESS, function_name="get_protocol_info", args=[])
    return str(page["accord_count"]), tx


def test_majority_resolves_against_one_conflicting_source(live_client, record):
    client, account = live_client
    if account is None:
        pytest.skip("no funded account configured")
    sources = [
        {"url": URLS["official"], "label": "Official status", "declared_class": "OFFICIAL"},
        {"url": URLS["conflicting"], "label": "Daily brief", "declared_class": "INDEPENDENT"},
        {"url": URLS["derived"], "label": "Watch digest", "declared_class": "INDEPENDENT"},
    ]
    rid, created = create_accord(client, account, "Is the Meridian Relay operational?", sources,
                                 {"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2})
    time.sleep(45)  # let the window open
    observed = client.write_contract(address=ADDRESS, function_name="observe_accord", args=[rid])
    wait_finality(client, observed)
    time.sleep(310)  # the contract's finality delay
    finalized = client.write_contract(address=ADDRESS, function_name="finalize_result", args=[rid])
    wait_finality(client, finalized)
    got = client.read_contract(address=ADDRESS, function_name="get_accord", args=[rid])
    assert got["status"] == "FINALIZED"
    assert got["current_state"] in ("OPERATIONAL", "DEGRADED", "DOWN")
    record.append({
        "case": "majority_resolves_against_one_conflicting_source",
        "accord_id": rid,
        "outcome": got["current_state"],
        "transactions": [
            {"kind": "create", "hash": created},
            {"kind": "observe", "hash": observed},
            {"kind": "finalize", "hash": finalized},
        ],
        "bond_refunded": False,
    })
