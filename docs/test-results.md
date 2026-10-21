# ACCORD — Reproducible test results

Canonical release: `0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d`.

## Current verification run

The following checks were executed against this repository and the canonical
StudioNet deployment after the release pointer was updated.

| Check | Result | Reproduce |
| --- | --- | --- |
| On-chain source identity | PASS — chain and local LF-normalized SHA-256 are both `49ec9a1f770347ddf1842f7a90a2bbca518c705e451f229d8b79de1fea1c9d4b` | `python scripts/verify_deployment.py 0x68b3…1aC0d` |
| Contract schema | PASS — 17/17 methods; empty `list_accords`, `list_by_creator`, `returned_for`, `get_returned_deposits`, and `list_transitions` all answer | `node` probe / interface deployment check |
| Review safeguards in stored source | PASS — exact + masked digests, provenance check, date basis, cycle grouping, shared classifier, validity floor, expired finalize branch all present | source identity makes local tests apply to chain source |
| Next route type generation | PASS | `npx next typegen` |
| TypeScript strict check | PASS | `npm exec tsc -- --noEmit --pretty false` |
| Interface tests | PASS — 27/27 | `npx vitest run tests/frontend` |
| Production build | PASS | `npm run build` |
| Production health | PASS — canonical address returned, deployment configured | `curl /api/health` |
| Direct-mode suite in this sandbox | BLOCKED — sandbox Python is 3.11; `genlayer-test` requires `collections.abc.Buffer` (Python 3.12). The public CI job runs Python 3.12 and executes it there. | `python -m pytest tests/direct -v` on Python 3.12 |
| Complete funded lifecycle on the new release | READY, NOT FABRICATED — the explorer currently shows the deployment transaction only; no funded private key exists in this sandbox. Run the command below and commit its generated record. | `scripts/lifecycle_e2e.py` |

## Complete lifecycle command

```bash
ACCORD_DEPLOYER_KEY=<funded StudioNet test key> \
ACCORD_CONTRACT=0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d \
python scripts/lifecycle_e2e.py
python scripts/render_e2e.py
```

A passing result has five finalized transaction hashes — create, observe,
finalize, close, refund — and an accounting block where:

```text
status = CLOSED
bond_status = REFUNDED
bond_deposited = 0
refunded_amount = bond sent at creation
```

The script appends exactly that chain-derived evidence to
`docs/live-e2e.json`. Until a funded wallet runs it, the file stays an empty
array: the repository never publishes planned transactions as executed facts.

## Public CI

`.github/workflows/ci.yml` runs on every push and pull request:

1. Node 22: install, TypeScript, 27 interface tests, production build against
   the canonical address.
2. Python 3.12: GenVM tooling, contract parse/lint and the direct-mode suite.

After pushing, link the green Actions run in the submission. That run is the
public, reproducible test receipt; this file is the local command record.
