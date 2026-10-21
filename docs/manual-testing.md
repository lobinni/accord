# ACCORD — Manual testing guide

Test everything **live on StudioNet** against the deployment of record:
`0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d`
([explorer](https://explorer-studio.genlayer.com/address/0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d)).
There is no demo mode and no demo data: every value on screen comes from the
contract or the chain. Budget 60–90 minutes for the full pass (the contract's
finality delay and observation interval are real).

## 0. Prerequisites

1. **MetaMask** (or any injected wallet, discovered via EIP-6963).
2. **StudioNet on chain 61999.** The app offers to add it; to add it by hand:
   - Network name: `GenLayer StudioNet`
   - RPC: `https://studio.genlayer.com/api`
   - Chain id: `61999`
   - Currency: `GEN`
   - Explorer: `https://explorer-studio.genlayer.com`
3. **Test GEN** from the StudioNet faucet — each full lifecycle needs roughly
   0.02 GEN of bond plus gas; every bond is refunded at the end of its run.
4. The interface running with `GENLAYER_NETWORK=studionet`,
   `GENLAYER_CHAIN=61999`, `ACCORD_CONTRACT=0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d`.

## 1. Deployment verification (2 minutes)

- [ ] No amber **Deployment pending** banner anywhere (it appears only when the
  address is unset or malformed).
- [ ] Dashboard counters read live: questions frozen, bonds in custody.
- [ ] Health probe answers with the same address:
  `curl -s localhost:3000/api/health` shows `"deploymentConfigured": true`.
- [ ] Code identity (optional, from a shell with Python):
  `python scripts/verify_deployment.py 0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d`
  proves the on-chain code is byte-identical to `contracts/accord.py`.

## 2. Full lifecycle with sample 01 (30–40 minutes)

Use [samples/01-majority-categorical.json](../samples/01-majority-categorical.json)
— it lists exactly what to type at each of the eight steps.

1. **Connect.** Click *Connect wallet*, pick MetaMask. If the pill warns about
   the network, click **Switch to StudioNet · 61999** and approve.
   - [ ] The header shows your shortened address and a mint dot.
2. **Create.** Walk steps 1–8 with the sample inputs. On the review step:
   - [ ] Publisher grouping shows three independent voices.
   - [ ] Changing the bond outside 0.001–10000 GEN produces a worded refusal
     before the wallet ever opens.
   - [ ] Sign & freeze carries exactly the bond as transaction value in MetaMask.
3. **Track.** The seven rungs must advance in order: signed → read back →
   queued → leader proposed → validators voted → the contract shows the write →
   final. Skipped rungs are marked *implied*, never "observed".
   - [ ] The new accord appears; its page shows status *Waiting for its first observation*.
4. **Observe.** When the window opens (sample: 5 minutes), press *Observe now*.
   - [ ] The evidence map shows each source's availability, grounded claim and
     quote; a page that does not answer is NO_CLAIM, a 404 is MISSING — never
     counted as disagreement.
   - [ ] The conflict graph shows one node per publisher group.
   - [ ] The lifecycle pane lists the observation transaction with the
     validators' recorded votes.
5. **Finalize.** The act stays disabled with the reason "still running" until
   300 seconds pass, then sends; the state becomes final and the state history
   gains its first entry.
6. **Reload the page.** Everything you saw is still there — nothing was local.
7. **Close & refund.** After the window ends (shorten the sample window to
   ~15 minutes if you want to finish today):
   - [ ] *Close the request*, then *Refund the bond*; the bond panel shows the
     exact amount returned to the creator and the wallet balance increases by
     that amount.
   - [ ] Pressing refund again is impossible: no refund act is offered anymore.

## 3. The walls (10 minutes)

Each refusal must arrive **in the contract's own words**, inside the tracker.

- [ ] **Wrong bond**: submit a creation whose attached value does not equal the
  term (raise/lower in MetaMask if your wallet allows editing, or alter
  `samples/`): the bond returns in the same transaction and appears under the
  Record hall's *Deposits sent straight back* with the reason.
- [ ] **Non-creator cancel**: from a second account, open an unobserved request
  — the cancel act is visible but disabled, saying only the creator may cancel.
- [ ] **Early finalize**: while PROPOSED, the finalize act shows its reason and
  the time it becomes available.
- [ ] **Refund while locked**: the refund act shows it stays locked until close.
- [ ] **Observe during cooldown**: after one observation, the observe act names
  the next possible observation time (15-minute interval).
- [ ] **Observe outside the window**: before it opens / after it closes, the
  act explains which boundary blocks it.

## 4. Policies and adversarial pages (as time allows)

Each sample file lists its inputs, the expected outcome and the manual checks.
The essential behaviors to witness:

- [samples/02](../samples/02-authority-temporal.json) — an official source
  confirmed independently; dates must be written inside the grounded passage.
- [samples/03](../samples/03-numeric-tolerance.json) — numbers agree only
  within the request's tolerance; stale evidence is excluded under freshness.
- [samples/04](../samples/04-strict-and-injection.json) — two pages of one
  publisher are **one voice**; a republishing page adds none; a page that
  instructs the panel contributes nothing.
- [samples/05](../samples/05-threshold-policy.json) — the leading claim must
  clear the basis-point bar; rerun variants at 60.01% and 90% to watch the
  same evidence flip outcomes in code.
- [samples/06](../samples/06-multi-round-and-expiry.json) — the 15-minute
  observation interval, two immutable rounds, and the EXPIRED transition once
  validity lapses.

## 4c. Source integrity (revision 2)

- [ ] **Two digests per source.** Every evidence card shows *exact page kept*;
  hover it to see the unmasked commitment. The masked consensus digest is a
  different value — that separation is the guarantee.
- [ ] **Date basis in words.** Each card names where its date came from: *the
  page's own statement*, *server metadata*, or *no date anywhere*.
- [ ] **Figure movement does not break agreement.** Observe a request whose
  pages show live counters: honest rounds still resolve, and each source keeps
  its own exact provenance digest.
- [ ] **Word changes are not hidden.** If a page's wording changes between
  reads, the round rotates rather than recording a mismatched page.
- [ ] **Long pages are sampled, and say so.** A page beyond the excerpt cap
  shows *long page sampled*; nothing outside the retained regions can be
  claimed.

## 4d. Complete lifecycle with the bond refund (one command)

```bash
ACCORD_DEPLOYER_KEY=<funded StudioNet test key> \
ACCORD_CONTRACT=0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d \
python scripts/lifecycle_e2e.py
```

- [ ] The script prints five transaction hashes in order — create, observe,
  finalize, close, refund — each reaching finality.
- [ ] The accounting readback shows the request `CLOSED`, `bond_status`
  `REFUNDED`, and `refunded_amount` equal to the bond attached at creation.
- [ ] The wallet balance rises by exactly the refunded amount.
- [ ] `docs/live-e2e.json` gains the executed record; `python
  scripts/render_e2e.py` turns it into the executed-cases table in
  [e2e.md](e2e.md).

## 4b. Freshness disciplines (post-review)

- [ ] **Undated pages are stale, not current.** Create a freshness-constrained
  request against a page whose content carries no date: its evidence card
  reads *older than the freshness requirement* and *excluded*, while the
  overall round still completes (never fails).
- [ ] **A readable page that says nothing never breaks a round.** An
  irrelevant or instruction-only page reconciles to an unresolved outcome and
  its card says *does not answer the question* — the observation succeeds.
- [ ] **Stored classifications are real.** After a majority-with-dissent round,
  supporting sources show *supports the state* and the dissenter *contradicts
  the state* — nothing reads *could not be read* once the page was readable.
- [ ] **Citation loops count once.** Two sources citing each other merge into
  one voice in the conflict graph (they cannot pass a two-group minimum).
- [ ] **Validity floor.** The create flow refuses a result validity below
  6 minutes with a worded reason, exactly as the contract does.
- [ ] **Expired proposals never go current.** Any proposal waiting past its
  validity finalizes into *EXPIRED* — the state history shows the expiry
  transition, never the stale value.

## 5. Verify everything without trusting the app

Independent, explorer-and-RPC verification of the run you just did:
[manual-explorer-verification.md](manual-explorer-verification.md) — code
identity, value flows, votes, timestamps, and the cross-checks that would
expose any mismatch.

## 6. Wallet and network reference

Setup, faucet budget, two-account tests and the troubleshooting table:
[manual-wallet-and-network.md](manual-wallet-and-network.md).

## 7. What "green" means

A full pass = samples 01–06 each reach their expected outcome, the eight walls
above each refuse with a worded reason, every bond returns to its creator, and
the Record hall shows the transitions and returned deposits you just caused —
the same record anyone can read from the contract (section 5 proves it).

## 8. Automated suites (for completeness)

```bash
npx vitest run tests/frontend            # interface logic, pinned to the deployed schema
pip install -r requirements.txt
python scripts/fetch_genvm_bundle.py     # once
python -m pytest tests/direct -v         # GenVM direct-mode suite
python scripts/mutate.py                 # mutation sweep: every mutant must die
SKIP_INTEGRATION=0 ACCORD_CONTRACT=0x68b3a9AbA75bdA7d6da3C8c2178150421791aC0d \
python -m pytest tests/integration -v -s # live StudioNet, ~40 minutes
```
