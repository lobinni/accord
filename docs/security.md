# ACCORD — Security review

Scope: `contracts/accord.py`, the observation pipeline, the interface's
handling of chain data and wallet interaction.

## Threat model

| Adversary | Capability | Defense |
| --------- | ---------- | ------- |
| Requester | Chooses question, sources, classes, policy, times | Everything they choose is frozen and validated deterministically; declared classes are labeled requester data and never verified by the model |
| Source publisher | Controls page content | Pages are fenced as untrusted data; injection text is ignored by protocol-first prompts; claims must be grounded in a passage each validator itself read |
| Leader node | Proposes the reading | Every validator repeats the whole task on its own fetch and model; fingerprint equivalence plus per-passage presence checks; numbers rechecked within tolerance |
| Any caller | May observe, finalize, close, refund | Callers influence nothing: results follow the frozen terms; refunds pay only the recorded creator; ledgers zero before value moves |
| Interface | Serves display code | Holds no keys, stores no state; every shown value traces to a contract view or a chain receipt |

## Injection defense

- Requester strings are sanitized before entering a prompt; runs of angle
  brackets are replaced, never deleted, so a fence cannot be forged mid-text.
- Evidence sits between `<<<SOURCE S1>>>` / `<<<END SOURCE S1>>>` fences and is
  declared untrusted external data in the protocol instructions that precede it.
- Each source gets its own prompt: one page cannot steer the reading of
  another, and cannot append instructions to a shared context.
- A page that contains only instructions ("ignore previous…") answers the
  question not at all; it is recorded as `NO_CLAIM`, not as a vote.

## Grounding

- A categorical or boolean claim needs a 12–240 character passage present in
  the node's own copy (whitespace- and case-folded).
- A numeric or temporal claim additionally needs the exact figure written in
  that passage. The model never converts units; conversion attempts collapse
  to `NONE`.
- Dates count only when the written date appears inside the grounded passage.

## Consensus equivalence

- Fingerprints cover every decision-bearing and stored field.
- Numbers compare within the request's tolerance band.
- Passages compare figure-masked: live counters may tick between two honest
  fetches; words may not.
- A leader that fails with a rule error is matched word-for-word; model-format
  failures rotate the round instead of recording.

## Value safety

- One exit path for GEN; ledgers zeroed before the transfer; refunds exactly
  once, only to the recorded creator.
- Refused creations return deposits in the same transaction with the reason
  on record.
- The bond never enters the reconciliation: no field of the result reads it.

## Interface

- Wallet integration is EIP-1193/EIP-6963 only; no key exists anywhere in the
  application; there is no server-side signer.
- The app proposes chain 61999 (StudioNet) and asks the wallet to switch; it
  never signs for a different chain.
- Raw contract payloads are mapped to human-readable display before rendering;
  nothing renders executable content from pages, results, or labels.
- Contract address configuration fails closed: a missing or malformed address
  stops the app with an explanation rather than targeting a guess.

## Known limits

- A source behind authentication or heavy JavaScript is simply `UNAVAILABLE`
  to the fetcher; design requests around static, public pages.
- Temporal grounding uses written dates; pages with no date and a non-zero
  freshness requirement fall back to HTTP `Last-Modified` when present.
- The 300 s finality delay is a contract-level safety margin over the
  StudioNet appeal window; finalize only after it.
