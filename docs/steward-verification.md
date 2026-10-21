# ACCORD — Steward verification matrix

Canonical release: `0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d` on
GenLayer StudioNet (chain 61999).

This matrix maps every acceptance concern to the exact contract guarantee,
its regression test, its live-release evidence and its manual reproduction.

| Steward concern | Contract guarantee | Regression tests | Live / manual evidence |
| --- | --- | --- | --- |
| One canonical release | The application, environment example, CI, README and all docs point to one address. The running source and `contracts/accord.py` have one LF-normalized SHA-256: `49ec9a1f…d4b`. | CI address audit plus `scripts/verify_deployment.py`. | `python scripts/verify_deployment.py 0x68b3…1aC0d`; [deployment.json](deployment.json). |
| Complete lifecycle and bond refund | `create_accord` locks the exact transaction value; `close_accord` makes it refundable; `refund_bond` zeros ledgers before the transfer and pays only the recorded creator, once. | `test_lifecycle.py`, `test_live_bond.py`. | `scripts/lifecycle_e2e.py` records create → observe → finalize → close → refund and the final accounting into `live-e2e.json`; browser equivalent in [manual-testing.md](manual-testing.md) §2. |
| Undated information under freshness | With a non-zero freshness requirement, no verified date means STALE, never CURRENT. | `test_undated_page_is_stale_under_a_freshness_requirement`, `test_undated_sources_carry_no_basis_and_are_not_current`. | Evidence card reads *no date anywhere* + stale/excluded; manual §4b. |
| Readable page with no grounded claim | Availability remains AVAILABLE; claim stays NONE; freshness stays independently STALE/CURRENT; evidence is NO_CLAIM and the round completes unresolved. | `test_readable_no_claim_no_date_pages_do_not_fail_the_round`, `test_instruction_pages_are_recorded_as_making_no_claim`. | Manual §4b. |
| Accurate stored evidence classification | `_evidence_class` is the one classifier used in reconciliation and rebuilding. `evidence_status` is part of the consensus fingerprint. | `test_stored_evidence_keeps_its_real_classification`. | Evidence map shows supporting, conflicting, no-claim, excluded and unavailable in words. |
| Cyclic publisher dependency | `_independence_groups` detects a loop and assigns every loop member to one deterministic origin. | `test_reciprocal_citations_group_deterministically`, republisher tests. | Conflict graph: a reciprocal loop counts as one voice; manual §4b. |
| Requester-declared official sources | The class is explicit requester metadata, never authenticated; authority policy still requires separately grouped confirmations. | Authority policy creation and policy tests. | Review step and [contract.md](contract.md) state the limitation. |
| Validity vs. finality | Minimum validity is 360 seconds (300-second delay + margin); a late proposal finalizes to EXPIRED instead of a stale current state. | Direct validity-floor test, frontend validity-floor test, lifecycle expiry tests. | Manual §4b and sample 06. |
| Long-page coverage | Whole-page digests are computed before truncation; excerpts keep head + tail with an omission marker; omitted text cannot ground a claim. | Source-integrity / evidence-quality suite; long-page fixture described below. | Evidence card labels long pages as sampled; manual §4c. |
| Exact historical provenance | `text_sha256_exact` commits to the unmasked entire page; `text_sha256_masked` is separately named and used only for comparison. `_provenance_holds` verifies a leader's stored exact digest against the validator's own exact or masked-equivalent read. Numeric claims still use tolerance checks. | `test_both_digests_are_stored_and_distinct`, `test_figure_only_differences_do_not_break_consensus`, `test_word_changes_are_not_ignored`, `test_unreadable_sources_carry_no_provenance`. | Evidence card reads *exact page kept*; hover exposes the exact commitment. Manual §4c. |
| Claim date vs. HTTP metadata | `date_basis` is `CLAIM`, `SERVER` or empty. Freshness prefers the page-stated claim date; HTTP Last-Modified is recorded distinctly. | `test_date_basis_distinguishes_claim_dates_from_server_metadata`. | Evidence card reads *the page's own statement*, *server metadata* or *no date anywhere*. |
| Reproducible tests | Public GitHub Actions runs typecheck, 27 interface tests, production build, contract syntax, GenVM direct suite when the executor is available. | `.github/workflows/ci.yml`. | Local commands below. |

## Reproduce the release checks

```bash
# Exact source identity from the chain alone
python scripts/verify_deployment.py 0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d

# Interface
npm ci
npm run typecheck
npx vitest run tests/frontend
npm run build

# Contract direct mode
pip install -r requirements.txt
python scripts/fetch_genvm_bundle.py
python -m pytest tests/direct -v
python scripts/mutate.py

# Full StudioNet lifecycle (funded test wallet required)
ACCORD_DEPLOYER_KEY=<funded key> \
ACCORD_CONTRACT=0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d \
python scripts/lifecycle_e2e.py
python scripts/render_e2e.py
```

## Passing evidence required for submission

Commit these generated artifacts after the funded lifecycle run:

1. `docs/live-e2e.json` with five finalized hashes and `bond_refunded: true`;
2. regenerated `docs/e2e.md` with the executed-case row;
3. the GitHub Actions URL showing both CI jobs green;
4. optional browser capture showing MetaMask confirmation, the seven-rung
   transaction tracker, the live evidence map and the final refunded bond
   panel.
