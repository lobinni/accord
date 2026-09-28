# ACCORD

**When information conflicts, consensus establishes the state.**
Decentralized reconciliation of conflicting external information, on GenLayer StudioNet (chain 61999).

---

## Live on StudioNet

| | |
| - | - |
| Contract | `0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56` |
| Explorer | https://explorer-studio.genlayer.com/address/0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56 |
| Protocol | `ACCORD-1.0.0` · source `contracts/accord.py` · all 17 methods verified live |
| Network | StudioNet · chain `61999` · native token `GEN` |

The interface reads this deployment from the environment (`ACCORD_CONTRACT`)
and runs **live only**: no demo mode, no fixture data, no database. Every
value on every page is read from the contract or from the chain's own
consensus data. To point the app at a different deployment, change that one
environment value and restart.

## The problem

Status pages, registries, APIs, news and documentation disagree. They go stale, and they copy one another. When a smart contract, an agent or a person needs one answer, someone has to decide which source to believe. Today that is usually one server: it fetches some pages, reads them its own way and publishes an answer nobody can check. Whoever runs it decides the answer.

## What ACCORD does

A request fixes, once and for all:

- a question;
- 2 to 6 sources allowed to answer it;
- the form the answer must take;
- a reconciliation policy;
- an observation window;
- a freshness requirement;
- a GEN bond.

When the request is observed, every GenLayer validator fetches every source itself. Each one reports what each source states, with the exact passage that states it. The contract then applies the policy in code:

- sources are counted by **publisher**, not by URL;
- a source that repeats another adds no voice;
- a missing page is not a contradiction;
- evidence outside the freshness requirement is kept out.

If the policy is met, the result is the state. If it is not, the result is `UNRESOLVED`, never a guess. Results are immutable and every change of state is recorded in the history.

## Why consensus is necessary

Reading a page and saying what it claims is judgement, and a single operator's judgement is exactly what a conflict puts in doubt. On GenLayer that judgement is repeated independently. The leader proposes a reading, and each validator repeats the whole task on its own fetch, with its own model. A result is recorded only when they agree on:

- every source's claim, date, freshness and independence;
- the policy's outcome.

A passage any one of them did not see cannot be stored.

What can be deterministic is kept out of consensus: grouping by publisher, freshness arithmetic, the policy and the bond are plain code, identical on every node. The model reads; it never decides the state, and it never sees the bond. See [docs/architecture.md](docs/architecture.md).

| Decided by         | What                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| Contract code      | validation, source normalization, publisher grouping, freshness, the policy, the state, history, expiry, the bond      |
| GenLayer consensus | fetching each source and reading what it states, the passage that states it, its date, whether it repeats another source |
| The interface      | forms, previews, wallet requests and display; it decides nothing and stores nothing                                    |

## How reconciliation works

| Policy                 | Resolves when                                                                |
| ---------------------- | ---------------------------------------------------------------------------- |
| Majority               | more than half of the counted publishers agree, and at least the minimum     |
| Threshold              | the leading claim's share of counted publishers reaches the set basis points |
| Authority confirmation | the source declared official agrees with enough independent confirmations    |
| Strict                 | every counted publisher agrees                                               |

| Status                   | Meaning                                                         |
| ------------------------ | --------------------------------------------------------------- |
| RESOLVED                 | the policy was met; the state is the agreed claim               |
| UNRESOLVED\_INSUFFICIENT | too few independent, current, grounded sources                  |
| UNRESOLVED\_CONFLICT     | enough sources, but they disagree beyond what the policy allows |

A claim counts only if it is grounded: its passage must be in that node's own copy of the page, and a number or date must be written in that passage. Pages are fenced as untrusted data; a page that tells the panel what to answer is recorded as making no claim. Details: [docs/contract.md](docs/contract.md).

## Lifecycle

```
                    create_accord (GEN bond attached)
                              │
                              ▼
   cancel (creator,     SUBMITTED ─────────── observe_accord ─────────┐
   never observed) ◄──       │                (inside the window)     │
        │                    │                                        ▼
        ▼                    │                               PROPOSED  result R0, R1 …
   CANCELLED                 │                                        │
                             │                          300 s  finalize_result
                             │                                        ▼
                             │                               FINALIZED ── expire_result ─► state EXPIRED
                             │                                        │    (after its validity)
                             │                    ≥ 15 min later, observe again ──► PROPOSED …
                             ▼                                        ▼
                  window ends: close_accord ──► CLOSED (a result was final) / FAILED (none)

   bond:   LOCKED ──── cancel / close ────► REFUNDABLE ──── refund_bond ────► REFUNDED
```

## How the bond works

Every request carries a GEN bond, sent as the value of the creating transaction. It discourages spam and meaningless requests. It is **not** a stake on the answer, a reward or a vote: the reconciliation never reads it.

- The contract holds it until the observation window closes, or until the creator cancels a request that was never observed.
- Anyone may then send `refund_bond`, and the whole deposit goes to the recorded creator, exactly once.
- A creation the contract cannot accept sends the attached GEN straight back and records why.

See [docs/bond-model.md](docs/bond-model.md).

## Using it

**Connect a wallet.** Any injected browser wallet works (MetaMask, Rabby and others; they are discovered through EIP-6963 / EIP-1193). Choose **Connect wallet**. If the wallet is on another network, the app offers to switch to GenLayer StudioNet (chain **61999**). ACCORD never asks for, sees or stores a key.

**Create a reconciliation.** Go to **Create Accord** and work through the eight steps:

1. question;
2. sources, each with an optional label and a declared class;
3. answer form;
4. policy;
5. observation window;
6. freshness;
7. bond;
8. review. The review shows exactly what will be frozen, including how the sources group by publisher.

Confirm the transaction in your wallet. It carries the bond as its value. The page follows the transaction through GenLayer's stages and opens the request once the contract shows it.

**Observe and finalize.** On the request's page, **What can be done now** lists only the acts the contract will accept at that moment, and says why the others must wait.

- _Observe now_ asks GenLayer to read every source and record a result.
- After the contract's 300-second finality delay, _Finalize the result_ makes it the request's state.
- Once the window has ended, _Close the request_ and then _Refund the bond_ return the GEN to the creator.

Anyone may send these acts. The page shows the evidence map, the conflict graph, each source's status, the state history, the GenLayer lifecycle with the validators' recorded votes, and the bond.

**Finality.** A result is first accepted by GenLayer's consensus. It becomes the request's state only after the contract's own finality delay, when `finalize_result` is sent. The interface never calls anything current that the contract has not finalized. A result past its validity is not shown as current, and can be recorded as expired.

## Configuration

The contract address lives in exactly one place. Set it and everything — interface, scripts, verification — follows:

```bash
cp .env.example .env
# edit .env (the deployment of record is already the default)
GENLAYER_NETWORK=studionet
GENLAYER_CHAIN=61999
ACCORD_CONTRACT=0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56
# optional override; defaults to https://studio.genlayer.com/api
GENLAYER_RPC_URL=
```

`src/lib/genlayer/config.ts` holds the entire reader (`readConfig`) and
`src/lib/genlayer/server-config.ts` reads the environment once, server-side;
the result reaches the browser through one provider. No component stores an
address of its own, and nothing deployment-related is inlined into the client
bundle; swapping the deployment is a one-line change.

## Manual testing (live, guided)

A full hands-on pass against the deployment of record — wallet setup, the
complete create→observe→finalize→close→refund lifecycle, and every refusal
wall, with ready-to-type request inputs:

- Guide: [docs/manual-testing.md](docs/manual-testing.md) — the full guided
  pass: lifecycle, walls, policies, rounds, expiry.
- Verify without trusting the app:
  [docs/manual-explorer-verification.md](docs/manual-explorer-verification.md).
- Wallet, network and faucet reference:
  [docs/manual-wallet-and-network.md](docs/manual-wallet-and-network.md).
- Inputs: [samples/](samples) — six requests covering majority, authority
  confirmation, numeric tolerance, strict/unanimous plus a hostile page,
  threshold share, and multi-round with expiry.

## Running the automated tests

```bash
pip install -r requirements.txt
python scripts/fetch_genvm_bundle.py              # once, on a cold cache
genvm-lint check contracts/accord.py --json
python -m pytest tests/direct -v                  # GenVM direct-mode tests
python scripts/mutate.py                          # the mutation sweep over the contract

npm ci
npm run lint
npm run typecheck
npx vitest run tests/frontend                     # the interface, pinned to the deployed schema
npm run build

SKIP_INTEGRATION=0 ACCORD_CONTRACT=0xYourDeployedContractAddress \
python -m pytest tests/integration -v -s          # live StudioNet, about 40 minutes
```

The live suite writes `docs/live-e2e.json`. `python scripts/render_e2e.py` turns the records into [docs/e2e.md](docs/e2e.md).

## Deploying

```bash
python scripts/deploy.py                          # deploys, waits for finality, proves the code byte-identical
python scripts/verify_deployment.py <address>     # re-verifies any deployment from the chain alone
```

Then set `ACCORD_CONTRACT` (with `GENLAYER_NETWORK=studionet` and `GENLAYER_CHAIN=61999`) and start the app. See [docs/deployment.md](docs/deployment.md).

## Repository

```
contracts/accord.py       the Intelligent Contract
src/app/, src/components/, src/lib/   the Next.js interface (live-only; no database)
tests/direct/             GenVM direct-mode tests
tests/integration/        the live StudioNet suite
tests/frontend/           interface tests
tests/e2e/                the test wallet used for the in-app run
scripts/                  deploy, verify, mutation sweep, records
samples/                  ready-to-type request inputs for manual testing
demo/                     the demonstration pages used as conflicting, derived and injected sources
docs/                     architecture, contract, bond model, end-to-end record, deployment, security, manual testing
```

| Document                                 |                                                                    |
| ---------------------------------------- | ------------------------------------------------------------------ |
| [architecture.md](docs/architecture.md)  | trust model, responsibility split, source of truth per displayed value |
| [contract.md](docs/contract.md)          | methods, terms, publishers, the observation, policies, lifecycles  |
| [bond-model.md](docs/bond-model.md)      | custody, refund order, emitted versus confirmed                    |
| [e2e.md](docs/e2e.md)                    | every transaction of the in-app run and the live suite             |
| [deployment.md](docs/deployment.md)      | the deployment of record and how to reproduce it                   |
| [manual-testing.md](docs/manual-testing.md) | the guided live pass: lifecycle, walls, policies, rounds, expiry  |
| [manual-explorer-verification.md](docs/manual-explorer-verification.md) | prove every shown value from the explorer and raw RPC |
| [manual-wallet-and-network.md](docs/manual-wallet-and-network.md) | wallet, chain 61999, faucet budget, two-account tests |
| [security.md](docs/security.md)          | the security review                                                |
| [genlayer-api-notes.md](docs/genlayer-api-notes.md) | the GenLayer APIs this build relies on, as verified       |

## Deploying the interface (Vercel)

The interface is a plain Next.js app with **no database** — the GenLayer
contract is the only state it has.

1. Push this repository to GitHub (below), then **Import Project** on
   [vercel.com](https://vercel.com) and pick the repo; the framework preset is
   detected automatically (Next.js).
2. **Environment variables are optional.** The deployment of record
   (`0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56`) is built into
   `src/lib/genlayer/config.ts`, so a fresh import deploys live with zero
   configuration. Set them only to point at a different deployment:

   | Name | Value | Required |
   | ---- | ----- | -------- |
   | `ACCORD_CONTRACT` | your deployed `0x…` address | only to override the built-in one |
   | `GENLAYER_RPC_URL` | https RPC endpoint | only for a custom RPC |
   | `GENLAYER_NETWORK` | `studionet` | only to pin the network |
   | `GENLAYER_CHAIN` | `61999` | only to pin the chain id |

3. Deploy. Every page renders **on demand** (never statically prerendered), so
   configuration is read at request time: editing an environment variable and
   hitting **Redeploy** (no rebuild needed beyond the redeploy itself) takes
   effect immediately. After pushing changes, use **Redeploy → Clear build
   cache** once so no stale prerendered HTML survives from an older build.

```bash
vercel deploy --prod    # or: npx vercel --prod, after `npm i -g vercel`
```

## Pushing to GitHub

```bash
git init
git add -A
git commit -m "ACCORD: reconciliation protocol on GenLayer StudioNet"
git branch -M main
git remote add origin https://github.com/<your-user>/accord.git
git push -u origin main

# afterwards
git add -A && git commit -m "describe the change" && git push
```
