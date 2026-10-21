# ACCORD — End-to-end record

Target deployment: `0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d` on StudioNet
(chain 61999)
([explorer](https://explorer-studio.genlayer.com/address/0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d)).

## Verified on-chain (canonical release)

Canonical address: `0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d` — the only
address referenced anywhere in this repository (README, deployment record,
deployment guide, environment example, frontend fallback and CI all agree).

What has been verified directly against it:

- **17/17 schema methods answer** (`gen_getContractSchema`), exactly matching
  the pinned interface (`REQUIRED_METHODS` in `src/lib/genlayer/contract.ts`);
- **`get_protocol_info` round-trips** vocabulary `ACCORD-1.0.0`, policies,
  statuses, bounds and counters;
- **On-chain source is content-identical to the committed contract**
  (LF-normalized SHA-256 `49ec9a1f770347ddf1842f7a90a2bbca518c705e451f229d8b79de1fea1c9d4b`).
  The deployed code contains every reviewed safeguard: `_independence_groups`
  (cycle-safe grouping), `_evidence_class` (single classifier), undated ⇒
  STALE, `_excerpt_of` (head+tail sampling), the 360-second validity floor,
  the EXPIRED-instead-of-current finalize branch, and the complete
  source-integrity revision (`text_sha256_exact`, `text_sha256_masked`,
  `_provenance_holds`, `date_basis`).
- **No revision gap remains.** The source in this repository is exactly the
  source running at the canonical address; [deployment.json](deployment.json)
  contains one source hash and one canonical address.

Reproduce: `python scripts/verify_deployment.py 0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d`.

## Complete lifecycle with the bond refund

One command executes the whole sequence and records every transaction —
create → observe → finalize → close → refund — including the GEN transfer and
the final accounting readback from the contract's own views:

```bash
ACCORD_DEPLOYER_KEY=<funded StudioNet test key> \
ACCORD_CONTRACT=0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d \
python scripts/lifecycle_e2e.py
```

It appends to [live-e2e.json](live-e2e.json) (the executed-transaction
record) and prints the accounting: request status, recorded state,
`bond_status`, `refunded_amount` against the bond sent, supporting and
conflicting sources, and the number of state-history entries. Regenerate this
page afterwards with `python scripts/render_e2e.py`. The manual equivalent,
wallet-driven and step-by-step, is [manual-testing.md](manual-testing.md) §2.

## Current transaction evidence

The canonical address currently shows its finalized **deployment transaction**
on the public explorer. No complete funded lifecycle has yet been generated
from this repository for this address, so [live-e2e.json](live-e2e.json) is an
empty array — deliberately. Planned or previous-release transactions are never
presented as evidence for the current release.

Run `scripts/lifecycle_e2e.py` with a funded StudioNet test wallet to produce
the missing create → observe → finalize → close → refund evidence. Then run
`scripts/render_e2e.py`: every executed case row is generated from real
transaction hashes; no planned rows enter the record. The manual equivalent is
[manual-testing.md](manual-testing.md), with ready inputs under
[samples/](../samples).

## In-app run (design)

The walkthrough uses the demonstration pages in `demo/` plus independent
mirrors, driven entirely through the interface's create flow:

1. Create a categorical request — values `OPERATIONAL`, `DEGRADED`, `DOWN` —
   with a 0.02 GEN bond and a two-day window.
2. Observe inside the window; every validator fetches every source itself.
3. Finalize after the contract's 300 s finality delay.
4. Close after the window ends; refund the bond to the creator.

Expected record: 5 wallet-signed transactions, each reaching
`FINALIZED / MAJORITY_AGREE`, verifiable on the explorer from the contract
address page.

## Live suite cases

| # | Case | Expected outcome |
| - | ---- | ---------------- |
| 1 | Two pages of one publisher are one voice; a missing page is not a contradiction | RESOLVED |
| 2 | Majority resolves against one conflicting source | RESOLVED |
| 3 | Strict leaves the same evidence unresolved | UNRESOLVED_CONFLICT |
| 4 | A source that repeats another adds no voice | UNRESOLVED_INSUFFICIENT |
| 5 | Old evidence is stale when freshness is required | UNRESOLVED_INSUFFICIENT |
| 6 | An official source, independently confirmed | RESOLVED |
| 7 | A page that tries to instruct the panel | RESOLVED (recorded as making no claim) |
| 8 | Walls refused: double refund, early finalize, wrong bond, IP host, cancel by non-creator, observe outside window, early close, refund while locked | each refused in the contract's own words |

Every bond is refunded at the end of its run.

## Record format

Each executed case appends to `docs/live-e2e.json`, and `render_e2e.py`
renders the table above from it — cases, outcome, transaction hashes, and the
refund flag.

## Run it

```bash
SKIP_INTEGRATION=0 ACCORD_CONTRACT=0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d \
ACCORD_DEPLOYER_KEY=<funded test key> python -m pytest tests/integration -v -s
python scripts/render_e2e.py     # regenerates this file from docs/live-e2e.json
```
