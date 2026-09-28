"""Shared fixtures for the GenVM direct-mode suite.

Each test deploys a fresh ACCORD contract inside the local GenVM executor
(see scripts/fetch_genvm_bundle.py) and drives it through the gltest harness.
Set ACCORD_CONTRACT_OVERRIDE to a contract path to point the suite at a
mutant (scripts/mutate.py).
"""

from __future__ import annotations

import json
import os
import time
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent.parent
CONTRACT = Path(os.environ.get("ACCORD_CONTRACT_OVERRIDE", ROOT / "contracts" / "accord.py"))

NOW = 1_800_000_000  # arbitrary fixed point; the harness binds its own clock

MIN_BOND = 10**15


def make_terms(sources, policy=None, result_type=None, *, start=None, end=None,
               freshness=86_400, validity=86_400):
    start = NOW + 300 if start is None else start
    end = start + 86_400 if end is None else end
    policy = policy or {"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2}
    result_type = result_type or {"kind": "CATEGORICAL", "values": ["OPERATIONAL", "DEGRADED", "DOWN"]}
    return json.dumps({
        "sources": sources,
        "result_type": result_type,
        "policy": policy,
        "observation_window_start": start,
        "observation_window_end": end,
        "freshness_requirement": freshness,
        "validity_seconds": validity,
    })


def two_sources():
    return [
        {"url": "https://status.meridian-relay.example/", "label": "Status page", "declared_class": "OFFICIAL"},
        {"url": "https://relaywatch.example.net/bulletin", "label": "Watch bulletin", "declared_class": "INDEPENDENT"},
    ]


@pytest.fixture(scope="session")
def contract_path():
    return str(CONTRACT)


@pytest.fixture()
def deploy():
    """Deploy a fresh contract and return (contract, account)."""
    from gltest import get_contract_factory, default_account

    factory = get_contract_factory(contract_code=CONTRACT.read_text(encoding="utf-8"))
    account = default_account()
    contract = factory.deploy(args=[], account=account)
    return contract, account
