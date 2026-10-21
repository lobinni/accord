# ACCORD — GenLayer API notes

The APIs this build relies on, as used and verified against StudioNet
(chain 61999, RPC `https://studio.genlayer.com/api`).

## In the contract (GenVM)

- `gl.nondet.web.get(url, headers=…)` — fetch a page; we read `status`, `body`
  and `headers`. 404/410 map to `MISSING`; 2xx with a bounded, decodable,
  non-empty body maps to `AVAILABLE`; anything else is `UNAVAILABLE`.
- `gl.nondet.exec_prompt(prompt, response_format="json")` — one extraction
  prompt per source. JSON mode keeps model output parseable; malformed output
  raises `[LLM_ERROR]` and the round rotates rather than recording.
- `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)` — optimistic consensus.
  Every `gl.nondet` call sits directly inside the closure passed to it, which
  is why the fetch/prompt block appears identically in both closures
  (genvm-lint enforces this).
- `gl.message.sender_address`, `gl.message.value` — caller and attached value.
- `gl.vm.UserError` — rule refusals; the message is part of the record.
- `gl.evm.contract_interface(…).emit_transfer(value=…)` — the GEN exit path
  for refunds and returned deposits.
- `datetime.datetime.now(timezone.utc)` — bound by GenVM to the transaction
  datetime, so every validator re-execution reads the same instant.

## From the interface (genlayer-js)

- `createClient({ chain, account?, provider? })` — reads use the RPC
  provider; writes are handed to the user's injected EIP-1193 provider with
  the connected address, so the wallet signs every transaction. No key exists
  in the app.
- `client.initializeConsensusSmartContract()` — one-time per session before
  sending writes.
- `client.readContract({ address, functionName, args })` — contract views
  (`get_accord`, `get_result`, `get_results`, `get_history`, `list_accords`,
  `get_protocol_info`, …). Views return structured values already decoded.
- `client.writeContract({ address, functionName, args, value })` — writes;
  `value` carries the bond on `create_accord`. Returns the transaction hash
  once accepted.
- `client.waitForTransactionReceipt({ hash, retries, interval })` — polls
  until the transaction reaches `FINALIZED`; the returned receipt carries the
  consensus status, validator votes and the decoded write result.
- `client.getTransaction({ hash })` — lifecycle inspection for the tx tracker:
  status (`PENDING`, `PROPOSING`, `COMMITTING`, `REVEALING`, `ACCEPTED`,
  `FINALIZED`) plus per-validator votes.

## Values

- GEN amounts travel as decimal strings in atto (`10^18` atto = 1 GEN); the
  interface converts for display only.
- Times are UTC Unix seconds at the contract side and render as local times
  in the interface.
- The wallet must be on chain `0xF22F` (61999). The app calls
  `wallet_switchEthereumChain`, falling back to `wallet_addEthereumChain`
  with the StudioNet parameters, then re-checks.
