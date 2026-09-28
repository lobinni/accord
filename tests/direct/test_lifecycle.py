"""The request state machine: cancel, close, refund, and their walls."""

from __future__ import annotations

import pytest

from gltest_assertions import user_error  # provided by the test tooling

from .conftest import MIN_BOND, make_terms, two_sources


def _create(contract, account=None):
    return contract.create_accord(args=["Q", make_terms(two_sources()), MIN_BOND], value=MIN_BOND, account=account)


def test_cancel_only_by_creator_and_only_before_observation(deploy):
    contract, account = deploy
    rid = _create(contract, account)
    with user_error("only the creator can cancel"):
        contract.cancel_accord(args=[rid])  # other account
    contract.cancel_accord(args=[rid], account=account)
    got = contract.get_accord(args=[rid])
    assert got["status"] == "CANCELLED"
    assert got["bond_status"] == "REFUNDABLE"


def test_refund_pays_the_creator_exactly_once(deploy):
    contract, account = deploy
    rid = _create(contract, account)
    contract.cancel_accord(args=[rid], account=account)
    returned = contract.refund_bond(args=[rid])
    assert int(returned) == MIN_BOND
    got = contract.get_accord(args=[rid])
    assert got["bond_status"] == "REFUNDED"
    assert got["refunded_amount"] == str(MIN_BOND)
    with user_error("already refunded"):
        contract.refund_bond(args=[rid])


def test_no_refund_while_locked(deploy):
    contract, account = deploy
    rid = _create(contract, account)
    with user_error("until the request closes"):
        contract.refund_bond(args=[rid])


def test_close_waits_for_the_window(deploy):
    contract, account = deploy
    rid = _create(contract, account)
    with user_error("the observation window closes"):
        contract.close_accord(args=[rid])


def test_unknown_ids_fail_in_words(deploy):
    contract, _ = deploy
    with user_error("does not exist"):
        contract.get_accord(args=["999"])
