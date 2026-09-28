# ACCORD — Independent verification on the explorer

Everything the interface shows can be re-derived without trusting it. This
guide verifies a full run against the chain alone, using the explorer and raw
JSON-RPC. Target contract:
`0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56` on StudioNet (chain 61999).

## 1. The contract address page

Open https://explorer-studio.genlayer.com/address/0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56

- [ ] The address page loads for StudioNet and displays the contract's
  transactions and balance.
- [ ] The contract balance equals the sum of bonds currently LOCKED. After a
  refund lands, the balance decreases by exactly the refunded amount.

## 2. Code identity (optional, local)

```bash
python scripts/verify_deployment.py 0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56
```

- [ ] The stored code hash matches `contracts/accord.py` byte-for-byte; the
  live protocol info answers `ACCORD-1.0.0`.

## 3. Trace one creation you made

In the interface, create a request (see [manual-testing.md](manual-testing.md)).
Then:

1. Copy nothing from the app — open your wallet's activity and find the
   create transaction; open it on the explorer.
- [ ] **Value** equals the bond you chose, exactly.
- [ ] **Status** reaches FINALIZED; consensus shows the validators' agreement
  (e.g. MAJORITY_AGREE).
2. Unfurl the transaction's data: the decoded call is `create_accord` with
   your question, terms and bond — the same review the app showed.
3. In the app, the request page renders the identical terms.
- [ ] Question, sources (with computed publisher origins), policy, window,
  freshness, validity, bond — all match the transaction input.

## 4. Trace an observation round

1. Send *Observe now*; open that transaction on the explorer once final.
- [ ] The decoded call is `observe_accord` with only the request id — the
  caller passes no answer of any kind.
- [ ] Consensus data lists the leader round and the validators' votes, all
  in agreement with the recorded result.
2. In the app, the lifecycle pane shows the same transaction with the same
  votes; the evidence map shows, per source, the exact quote each claim is
  grounded in.
- [ ] Paste a quote into your own fetch of that page: the words are there.
- [ ] Any stored date appears inside its own quote; any stored number appears
  verbatim in its quote.
3. The result's `valid_until` equals the observation time plus the request's
  validity_seconds.

## 5. Finality, close and refund, in numbers

- [ ] The finalize transaction lands no earlier than 300 seconds after the
  observation transaction — enforced by the contract, visible on both
  timestamps.
- [ ] The close transaction comes after the window end in the frozen terms.
- [ ] The refund transaction sends exactly the bond from the contract to the
  creator's address — and the creator is the address from the **create**
  transaction, never the address that called refund (test by refunding from a
  second account if you have one).
- [ ] A second refund attempt cannot be sent from the app at all; if sent
  by hand it fails with the contract's own words ("already refunded").

## 6. Raw JSON-RPC cross-check (no UI at all)

```bash
curl -s https://studio.genlayer.com/api -H 'content-type: application/json' -d '{
  "jsonrpc": "2.0", "id": 1, "method": "sim_getTransactionsForAddress",
  "params": ["0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56"]
}' | python -m json.tool | head -50
```

- [ ] Every transaction the app attributed to your request appears exactly
  once, in the same order the record hall shows.

## 7. What would prove a mismatch

Any of the following means stop and re-check configuration:

- the app shows a state the explorer does not (a proposed result shown as
  current, a refund not paid to the creator);
- an act the app offers that the contract refuses;
- a view answering with a different question or terms than the transaction
  that froze them.

So far the split is absolute: the interface decides nothing and stores
nothing; this guide exists precisely so you can prove that to yourself.
