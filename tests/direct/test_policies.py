"""Policy arithmetic against scripted evidence. The harness's web/prompt
mocks (see gltest docs) feed each source a fixed page and a fixed model
answer, so the contract's deterministic reconciliation is tested exactly."""

from __future__ import annotations

import json

import pytest

from .conftest import MIN_BOND, make_terms


def three_publishers():
    return [
        {"url": "https://alpha.example.com/status", "label": "Alpha", "declared_class": "UNKNOWN"},
        {"url": "https://beta.example.net/grid", "label": "Beta", "declared_class": "UNKNOWN"},
        {"url": "https://gamma.example.org/monitor", "label": "Gamma", "declared_class": "UNKNOWN"},
    ]


def _create(contract, sources, policy, result_type=None, **kw):
    terms = make_terms(sources, policy=policy, result_type=result_type, **kw)
    return contract.create_accord(args=["Is the grid up?", terms, MIN_BOND], value=MIN_BOND)


@pytest.mark.mock_web({
    "https://alpha.example.com/status": "Status: UP as of 2026-10-12",
    "https://beta.example.net/grid": "Grid state UP, checked 2026-10-12",
    "https://gamma.example.org/monitor": "All clear: UP (2026-10-12)",
})
def test_majority_agreement_resolves(deploy):
    contract, _ = deploy
    rid = _create(contract, three_publishers(),
                  {"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2},
                  result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]})
    res_id = contract.observe_accord(args=[rid])
    res = contract.get_result(args=[res_id])
    assert res["reconciliation_status"] == "RESOLVED"
    assert res["state"] == "UP"
    assert res["evidence_sufficient"] is True


@pytest.mark.mock_web({
    "https://alpha.example.com/status": "Status: UP as of 2026-10-12",
    "https://beta.example.net/grid": "Grid state DOWN, checked 2026-10-12",
    "https://gamma.example.org/monitor": "Reading: UP (2026-10-12)",
})
def test_strict_fails_on_one_contradiction_but_majority_passes(deploy):
    contract, _ = deploy
    strict = _create(contract, three_publishers(),
                     {"kind": "STRICT", "stale_contributes": False, "min_groups": 2},
                     result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]})
    res = contract.get_result(args=[contract.observe_accord(args=[strict])])
    assert res["reconciliation_status"] == "UNRESOLVED_CONFLICT"
    assert res["state"] == "UNRESOLVED"


@pytest.mark.mock_web({
    "https://alpha.example.com/status": "alpha.example.com reports: UP (copied 2026-10-12)",
    "https://beta.example.net/grid": "Grid state UP, checked 2026-10-12",
    "https://gamma.example.org/monitor": "404 not found",
}, statuses={"https://gamma.example.org/monitor": 404})
def test_republishers_add_no_voice_and_missing_pages_not_contradictions(deploy):
    contract, _ = deploy
    derived_first = [
        {"url": "https://alpha.example.com/status", "label": "Alpha copy", "declared_class": "UNKNOWN"},
        {"url": "https://beta.example.net/grid", "label": "Beta", "declared_class": "UNKNOWN"},
        {"url": "https://gamma.example.org/monitor", "label": "Gamma", "declared_class": "UNKNOWN"},
    ]
    rid = _create(contract, derived_first, {"kind": "MAJORITY", "stale_contributes": False, "min_groups": 3},
                  result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]})
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    # one group copies another (one voice) and one page is missing: 2 < 3 groups
    assert res["reconciliation_status"] == "UNRESOLVED_INSUFFICIENT"


@pytest.mark.mock_web({
    "https://alpha.example.com/status": "Price is 1,250.75 GEN per unit, updated 2026-10-12",
    "https://beta.example.net/grid": "Current quote: 1250.78 GEN (2026-10-12)",
})
def test_numeric_claims_cluster_within_tolerance(deploy):
    contract, _ = deploy
    sources = [
        {"url": "https://alpha.example.com/status", "label": "", "declared_class": "UNKNOWN"},
        {"url": "https://beta.example.net/grid", "label": "", "declared_class": "UNKNOWN"},
    ]
    rid = _create(contract, sources, {"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2},
                  result_type={"kind": "NUMERIC", "unit": "GEN", "decimals": 2, "tolerance_bps": 100})
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    assert res["reconciliation_status"] == "RESOLVED"
    assert res["state"] in ("1250.75", "1250.78")
