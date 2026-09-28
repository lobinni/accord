"""Creation rules: valid requests are accepted; invalid ones return the deposit
with a recorded reason. Mirrors _parse_terms in the contract."""

from __future__ import annotations

import json

import pytest

from .conftest import MIN_BOND, NOW, make_terms, two_sources


def create(contract, question, terms, bond=MIN_BOND, account=None):
    return contract.create_accord(args=[question, terms, bond], value=bond, account=account)


def test_valid_request_is_accepted_and_indexed(deploy):
    contract, account = deploy
    rid = create(contract, "Is the relay operational?", make_terms(two_sources()))
    got = contract.get_accord(args=[rid])
    assert got["question"] == "Is the relay operational?"
    assert got["status"] == "SUBMITTED"
    assert got["bond_status"] == "LOCKED"
    assert got["bond_deposited"] == str(MIN_BOND)
    assert len(got["terms"]["sources"]) == 2
    listed = contract.list_by_creator(args=[account.address])
    assert any(item["accord_id"] == rid for item in listed["items"])


def test_one_source_is_refused_and_deposit_returned(deploy):
    contract, account = deploy
    rid = create(contract, "Q", make_terms(two_sources()[:1]))
    assert rid == ""
    returns = contract.get_returned_deposits(args=[])
    assert returns["total"] == 1
    entry = returns["items"][0]
    assert "between 2 and 6" in entry["reason"]
    # nothing was created
    assert contract.get_protocol_info(args=[])["accord_count"] == 0


def test_duplicate_urls_after_normalization_are_refused(deploy):
    contract, _ = deploy
    dup = [
        {"url": "https://example.com/a#one", "label": "", "declared_class": "UNKNOWN"},
        {"url": "https://www.example.com/a?utm_medium=email", "label": "", "declared_class": "UNKNOWN"},
    ]
    rid = create(contract, "Q", make_terms(dup))
    assert rid == ""


def test_ip_hosts_and_trailing_dots_are_refused(deploy):
    contract, _ = deploy
    for bad in ("https://93.184.216.34/x", "https://example.com./x"):
        terms = make_terms([
            {"url": bad, "label": "", "declared_class": "UNKNOWN"},
            {"url": "https://other.example.net/", "label": "", "declared_class": "UNKNOWN"},
        ])
        assert create(contract, "Q", terms) == ""


def test_wrong_bond_amount_is_returned(deploy):
    contract, _ = deploy
    rid = contract.create_accord(args=["Q", make_terms(two_sources()), MIN_BOND * 2], value=MIN_BOND)
    assert rid == ""
    assert "exactly" in contract.get_returned_deposits(args=[])["items"][0]["reason"]


def test_policy_needs_publishers_that_exist(deploy):
    contract, _ = deploy
    same_publisher = [
        {"url": "https://example.com/a", "label": "", "declared_class": "UNKNOWN"},
        {"url": "https://example.com/b", "label": "", "declared_class": "UNKNOWN"},
    ]
    terms = make_terms(same_publisher, policy={"kind": "MAJORITY", "stale_contributes": False, "min_groups": 2})
    assert create(contract, "Q", terms) == ""   # only one origin, needs two


def test_authority_confirmation_needs_an_official_source(deploy):
    contract, _ = deploy
    sources = [
        {"url": "https://a.example.com/", "label": "", "declared_class": "UNKNOWN"},
        {"url": "https://b.example.net/", "label": "", "declared_class": "INDEPENDENT"},
    ]
    terms = make_terms(sources, policy={"kind": "AUTHORITY_CONFIRMATION", "stale_contributes": False,
                                        "min_confirmations": 1})
    assert create(contract, "Q", terms) == ""


def test_window_and_freshness_bounds(deploy):
    contract, _ = deploy
    past = make_terms(two_sources(), start=NOW - 10_000)
    assert create(contract, "Q", past) == ""
    short = make_terms(two_sources(), start=NOW, end=NOW + 60)   # below the 10-minute minimum
    assert create(contract, "Q", short) == ""
