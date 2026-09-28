# ACCORD — Manual testing guide

Test everything **live on StudioNet** against the deployment of record:
`0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56`
([explorer](https://explorer-studio.genlayer.com/address/0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56)).
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
   `GENLAYER_CHAIN=61999`, `ACCORD_CONTRACT=0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56`.

## 1. Deployment verification (2 minutes)

- [ ] No amber **Deployment pending** banner anywhere (it appears only when the
  address is unset or malformed).
- [ ] Dashboard counters read live: questions frozen, bonds in custody.
- [ ] Health probe answers with the same address:
  `curl -s localhost:3000/api/health` shows `"deploymentConfigured": true`.
- [ ] Code identity (optional, from a shell with Python):
  `python scripts/verify_deployment.py 0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56`
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
SKIP_INTEGRATION=0 ACCORD_CONTRACT=0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56 \
python -m pytest tests/integration -v -s # live StudioNet, ~40 minutes
```
