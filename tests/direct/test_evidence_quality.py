"""Evidence-quality safeguards (post-review). Each case names the adversarial
or ambiguous input and the exact behavior the contract must hold.

Covers, live in GenVM direct mode:
- undated pages are STALE under a freshness requirement, never CURRENT
- a readable page with no grounded claim and no date is a valid observation
  (it reconciles to an unresolved outcome; it never fails well-formedness)
- stored evidence keeps its real classification (supporting/conflicting/
  excluded), never flattened to UNAVAILABLE
- reciprocal citations (dependency cycles) group deterministically
- a result that outlives its validity never becomes the current state
"""

from __future__ import annotations

import pytest

from .conftest import MIN_BOND, make_terms


def _pair(url_a="https://alpha.example.com/", url_b="https://beta.example.net/"):
    return [
        {"url": url_a, "label": "Alpha", "declared_class": "UNKNOWN"},
        {"url": url_b, "label": "Beta", "declared_class": "UNKNOWN"},
    ]


@pytest.mark.mock_web({
    "https://alpha.example.com/": "Status: UP, no date anywhere on the page",
    "https://beta.example.net/": "Grid: UP as of 2026-10-12 09:00",
})
def test_undated_page_is_stale_under_a_freshness_requirement(deploy):
    contract, _ = deploy
    terms = make_terms(_pair(), freshness=86_400,
                       policy={"kind": "MAJORITY", "stale_contributes": False, "min_groups": 1},
                       result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]})
    rid = contract.create_accord(args=["Is it up?", terms, MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    undated = next(e for e in res["evidence"] if "alpha" in e["source_url"])
    assert undated["availability"] == "AVAILABLE"
    assert undated["freshness"] == "STALE"      # not CURRENT, not UNAVAILABLE
    assert undated["evidence_status"] == "EXCLUDED"
    assert res["reconciliation_status"] == "RESOLVED"   # the dated source carries it alone


@pytest.mark.mock_web({
    "https://alpha.example.com/": "Words only, nothing about the question, no dates at all",
    "https://beta.example.net/": "Equally quiet prose with no answer and no date",
})
def test_readable_no_claim_no_date_pages_do_not_fail_the_round(deploy):
    contract, _ = deploy
    terms = make_terms(_pair(), freshness=86_400,
                       policy={"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2},
                       result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]})
    rid = contract.create_accord(args=["Is it up?", terms, MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    # the round completes: well-formedness accepts availability ≠ freshness ≠ claim
    assert res["reconciliation_status"] == "UNRESOLVED_INSUFFICIENT"
    assert res["state"] == "UNRESOLVED"
    for e in res["evidence"]:
        assert e["evidence_status"] == "NO_CLAIM"
        assert e["freshness"] == "STALE"


@pytest.mark.mock_web({
    "https://alpha.example.com/": "Status: UP as of 2026-10-12",
    "https://beta.example.net/": "Grid: DOWN, checked 2026-10-12",
    "https://gamma.example.org/": "Monitor: UP (2026-10-12)",
})
def test_stored_evidence_keeps_its_real_classification(deploy):
    contract, _ = deploy
    terms = make_terms(
        _pair() + [{"url": "https://gamma.example.org/", "label": "Gamma", "declared_class": "UNKNOWN"}],
        freshness=86_400,
        policy={"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2},
        result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]})
    rid = contract.create_accord(args=["Is it up?", terms, MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    assert res["reconciliation_status"] == "RESOLVED"
    sides = {e["source_url"].split("//")[1].split(".")[0]: e["evidence_status"] for e in res["evidence"]}
    assert sides["alpha"] == sides["gamma"] == "SUPPORTING"
    assert sides["beta"] == "CONFLICTING"
    assert all(e["text_sha256"] for e in res["evidence"])   # whole-page commitments stored


@pytest.mark.mock_web({
    "https://alpha.example.com/": "As beta.example.net says on its page: UP. Verified jointly 2026-10-12",
    "https://beta.example.net/": "Alpha's bulletin confirms exactly this: UP. Cross-checked 2026-10-12 and it cites alpha.example.com",
})
def test_reciprocal_citations_group_deterministically(deploy):
    contract, _ = deploy
    terms = make_terms(
        [
            {"url": "https://alpha.example.com/", "label": "alpha.example.net", "declared_class": "UNKNOWN"},
            {"url": "https://beta.example.net/", "label": "beta.example.net", "declared_class": "UNKNOWN"},
        ],
        freshness=86_400,
        policy={"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2},
        result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]})
    rid = contract.create_accord(args=["Is it up?", terms, MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    # a two-way citation loop cannot become two independent voices
    assert len(res["groups"]) <= 1
    assert res["reconciliation_status"] == "UNRESOLVED_INSUFFICIENT"


def test_validity_cannot_be_shorter_than_finality(deploy):
    contract, _ = deploy
    terms = make_terms(_pair(), validity=120)   # below the 360 s floor
    rid = contract.create_accord(
        args=["Q", terms, MIN_BOND], value=MIN_BOND)
    assert rid == ""
    assert "validity" in contract.get_returned_deposits(args=[])["items"][-1]["reason"]
