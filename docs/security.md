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

- Fingerprints cover every decision-bearing and stored field — including each
  source's evidence classification, its figure-masked whole-page digest and
  its date basis.
- Numbers compare within the request's tolerance band; nothing about a number
  is ever established by a masked digest.
- Passages compare figure-masked: live counters may tick between two honest
  fetches; words may not. Content that actually changes between honest reads
  fails the round instead of being recorded (fail-closed for mutable pages).
- **Exact provenance is recorded separately and verified, not assumed.** The
  leader stores the unmasked SHA-256 of each page it read; the validator
  accepts that digest only when it equals its own exact read, or when the two
  masked digests match (a figures-only difference). Stored quotations are
  therefore traceable to the exact content they came from, while consensus
  still tolerates honest figure movement.
- A leader that fails with a rule error is matched word-for-word; model-format
  failures rotate the round instead of recording.

## Additional protocol safeguards (post-review)

- **Undated ≠ current.** A page without a verifiable date is STALE whenever a
  freshness requirement exists; it cannot steer time-sensitive
  reconciliations, and counts only when the request explicitly allows stale
  evidence.
- **Layered states.** Availability (was the page read), claim presence (did
  it answer) and freshness (is it recent) stay independent, so readable
  no-answer or undated pages reconcile to an unresolved outcome instead of
  failing the whole observation.
- **No erased classifications.** Stored rows carry real classifications
  recomputed from the agreed outcome — historical evidence is accurate.
- **Cycle-safe grouping.** Reciprocal citations and mirrored mirrors group
  under one deterministic origin; loops cannot manufacture independence.
- **Declared classes are claims, not authentication.** A source declared
  OFFICIAL by the requester is a requester claim that the contract treats as
  metadata; authority confirmation still requires independent confirmations
  from other publishers, and no requester field can turn that off.
- **No expired promotion.** A proposal that outlives its validity while
  waiting behind the finality delay finalizes into `EXPIRED`; expired results
  never appear as current. Validity itself cannot be set shorter than the
  delay plus margin at creation.

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
