# ACCORD — End-to-end record

Target deployment: `0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56` on StudioNet
(chain 61999)
([explorer](https://explorer-studio.genlayer.com/address/0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56)).

This document is generated from `docs/live-e2e.json` by
`python scripts/render_e2e.py`. Every row is written from real executions;
until the live suite runs, it records the suite's design and the record
format. For a guided, by-hand pass use [manual-testing.md](manual-testing.md)
with the ready inputs under [samples/](../samples).

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
SKIP_INTEGRATION=0 ACCORD_CONTRACT=0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56 \
ACCORD_DEPLOYER_KEY=<funded test key> python -m pytest tests/integration -v -s
python scripts/render_e2e.py     # regenerates this file from docs/live-e2e.json
```
