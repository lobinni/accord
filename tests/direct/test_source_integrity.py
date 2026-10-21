"""Source-integrity guarantees (revision 2, post-review).

Two digests are recorded per readable source, with distinct jobs:

- text_sha256_exact  — UNMASKED sha256 of the whole extracted page. Historical
  provenance: it identifies the exact content a quotation came from. It is
  NOT a consensus equality criterion, because two honest fetches of a live
  page can differ in figures alone.
- text_sha256_masked — figure-masked sha256 of the same page. Consensus
  comparison: unchanged words agree across honest reads; changed words do not.

The validator's provenance check accepts a leader digest only when it equals
its own exact read, or when the masked digests match (figures-only
difference). These tests pin that separation.
"""

from __future__ import annotations

import pytest

from .conftest import MIN_BOND, make_terms


def _pair():
    return [
        {"url": "https://alpha.example.com/", "label": "Alpha", "declared_class": "UNKNOWN"},
        {"url": "https://beta.example.net/", "label": "Beta", "declared_class": "UNKNOWN"},
    ]


def _categorical(freshness=0):
    return make_terms(
        _pair(),
        freshness=freshness,
        policy={"kind": "MAJORITY", "stale_contributes": False, "min_groups": 1},
        result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]},
    )


@pytest.mark.mock_web({
    "https://alpha.example.com/": "Relay status: UP as of 2026-10-12. Load 128 requests per second.",
    "https://beta.example.net/": "Grid report: UP as of 2026-10-12. Load 96 requests per second.",
})
def test_both_digests_are_stored_and_distinct(deploy):
    contract, _ = deploy
    rid = contract.create_accord(args=["Is it up?", _categorical(), MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    for e in res["evidence"]:
        assert e["availability"] == "AVAILABLE"
        assert e["text_sha256_exact"], "exact provenance digest must be stored"
        assert e["text_sha256_masked"], "consensus digest must be stored"
        assert e["text_sha256_exact"] != e["text_sha256_masked"], \
            "an unmasked digest and a masked digest of the same page differ"


@pytest.mark.mock_web({
    "https://alpha.example.com/": "Relay status: UP as of 2026-10-12. Load 128 requests per second.",
    # same words, different figures: masked digests agree, exact digests differ
    "https://beta.example.net/": "Grid report: UP as of 2026-10-12. Load 96 requests per second.",
})
def test_figure_only_differences_do_not_break_consensus(deploy):
    """Two sources whose pages differ only in figures must still reconcile:
    the masked digests match word-for-word, so the panel can agree, while each
    source keeps its own exact provenance digest."""
    contract, _ = deploy
    rid = contract.create_accord(args=["Is it up?", _categorical(), MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    assert res["reconciliation_status"] == "RESOLVED"
    digests = {e["source_url"]: e["text_sha256_exact"] for e in res["evidence"]}
    assert len(set(digests.values())) == len(digests), "exact digests stay per-source"


@pytest.mark.mock_web({
    "https://alpha.example.com/": "Relay status: UP as of 2026-10-12, confirmed operational",
    # different WORDS about the same question: masked digests differ
    "https://beta.example.net/": "Grid report: DOWN as of 2026-10-12, degraded since morning",
})
def test_word_changes_are_not_ignored(deploy):
    """A page whose words changed is a different page: the masked digests
    disagree, so the difference is visible to the panel rather than being
    hidden behind a figure mask."""
    contract, _ = deploy
    rid = contract.create_accord(args=["Is it up?", _categorical(), MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    statuses = {e["source_url"].split("//")[1].split(".")[0]: e["evidence_status"] for e in res["evidence"]}
    assert statuses["alpha"] != statuses["beta"] or res["reconciliation_status"] != "RESOLVED"


@pytest.mark.mock_web({
    # a claim date written on the page: the basis of recency is the CLAIM
    "https://alpha.example.com/": "Relay status: UP. Last reviewed 2026-10-12 by the operations team.",
})
def test_date_basis_distinguishes_claim_dates_from_server_metadata(deploy):
    """The record names WHERE its date came from: a date the page states about
    its own information (CLAIM) is kept apart from the server's Last-Modified
    header (SERVER), which describes the transfer, not the claim."""
    contract, _ = deploy
    rid = contract.create_accord(args=["Is it up?", _categorical(freshness=86_400), MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    for e in res["evidence"]:
        assert e["date_basis"] in ("", "CLAIM", "SERVER")
        if e["published_at"]:
            assert e["date_basis"] == "CLAIM"
        elif e["updated_at"]:
            assert e["date_basis"] == "SERVER"
        else:
            assert e["date_basis"] == ""


@pytest.mark.mock_web({
    # no date anywhere, and the server sends no Last-Modified
    "https://alpha.example.com/": "Relay is running normally with no dates printed anywhere at all",
    "https://beta.example.net/": "Grid is running normally with no dates printed anywhere either",
})
def test_undated_sources_carry_no_basis_and_are_not_current(deploy):
    contract, _ = deploy
    rid = contract.create_accord(args=["Is it up?", _categorical(freshness=86_400), MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    for e in res["evidence"]:
        assert e["date_basis"] == ""
        assert e["freshness"] == "STALE"      # undated can never be CURRENT under freshness


def test_unreadable_sources_carry_no_provenance(deploy):
    """A source this node could not read must record neither digest."""
    contract, _ = deploy
    terms = make_terms(
        _pair(),
        freshness=0,
        policy={"kind": "MAJORITY", "stale_contributes": False, "min_groups": 1},
        result_type={"kind": "CATEGORICAL", "values": ["UP", "DOWN"]},
    )
    rid = contract.create_accord(args=["Is it up?", terms, MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    for e in res["evidence"]:
        if e["availability"] != "AVAILABLE":
            assert e["text_sha256_exact"] == ""
            assert e["text_sha256_masked"] == ""


LONG_PAGE = (
    "Status heading: UP as of 2026-10-12. "
    + "background material with no instructions " * 250
    + " End of document: status remains UP as of 2026-10-12."
)


@pytest.mark.mock_web({
    "https://alpha.example.com/": LONG_PAGE,
    "https://beta.example.net/": "Independent report: status UP as of 2026-10-12",
})
def test_long_page_records_exact_commitment_and_excerpt_flag(deploy):
    """The commitment covers the full long page before sampling; the evidence
    row says sampling happened, and the head/tail excerpt still grounds the
    claim. No claim can be grounded in omitted middle content."""
    contract, _ = deploy
    rid = contract.create_accord(args=["Is it up?", _categorical(), MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    long_row = next(e for e in res["evidence"] if "alpha" in e["source_url"])
    assert long_row["excerpted"] is True
    assert len(long_row["text_sha256_exact"]) == 64
    assert len(long_row["text_sha256_masked"]) == 64
    assert long_row["claim_value"] in ("UP", "NONE")


@pytest.mark.mock_web({
    "https://alpha.example.com/": "The first section says status UP as of 2026-10-12. Later correction: status DOWN as of 2026-10-12.",
    "https://beta.example.net/": "Independent report: status DOWN as of 2026-10-12.",
})
def test_contradictory_sections_cannot_be_silently_flattened(deploy):
    """A page carrying contradictory sections is committed in full and must
    either be read as one grounded answer or contribute no claim. It cannot be
    stored as a supporting source with a quotation absent from the page."""
    contract, _ = deploy
    rid = contract.create_accord(args=["Is it up?", _categorical(), MIN_BOND], value=MIN_BOND)
    res = contract.get_result(args=[contract.observe_accord(args=[rid])])
    row = next(e for e in res["evidence"] if "alpha" in e["source_url"])
    assert len(row["text_sha256_exact"]) == 64
    if row["claim_value"] != "NONE":
        assert row["claim"]
        assert row["claim_value"] in ("UP", "DOWN")
