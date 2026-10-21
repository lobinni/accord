# ACCORD — Contract reference

`contracts/accord.py` is a GenLayer Intelligent Contract (Python, GenVM).
Protocol version `ACCORD-1.0.0`.

## Terms of a request

A request freezes, at creation:

- `question` — up to 300 characters;
- `sources` — 2 to 6 https addresses, each with an optional label (80 chars)
  and a declared class: `OFFICIAL`, `INDEPENDENT` or `UNKNOWN`;
- `result_type` — `CATEGORICAL` (2–8 uppercase values), `BOOLEAN`, `NUMERIC`
  (unit, decimals 0–6, tolerance 0–2000 bps) or `TEMPORAL` (a YYYY-MM-DD date);
- `policy` — `MAJORITY`, `THRESHOLD` (with `threshold_bps` above 5000),
  `AUTHORITY_CONFIRMATION` (with `min_confirmations`) or `STRICT`; plus
  `stale_contributes` deciding whether stale-but-readable evidence still counts;
- `observation_window_start` / `observation_window_end` — 10 minutes to 366 days;
- `freshness_requirement` — seconds; 0 disables the age condition;
- `validity_seconds` — how long a finalized result may be shown as current;
  it cannot be shorter than the finality delay plus margin (360 s), so a
  result always outlives the delay it waits behind;
- `bond_required` — 0.001 to 10000 GEN, attached as the transaction value.

Validation is deterministic and identical on every node. Hosts must be plain
ASCII, non-IP, with no trailing or doubled dots; URLs normalize to one
spelling (case, `www.`, default port, fragment, trailing slash, `utm_` params).

## Publishers, not URLs

Sources are counted by **origin**, computed in code: the registrable domain,
or the publisher's name on multi-publisher hosts (GitHub, npm registries, CDNs).
Two pages of one publisher are one voice. A source that republishes another —
proved by a passage on its own page naming the other source or reproducing a
long copied passage — joins that source's group and adds no voice.

## The observation

`observe_accord` (anyone, inside the window, at most once per 15 minutes):

1. Every validator fetches every source itself (`gl.nondet.web.get`).
   404/410 is `MISSING`; other failures are `UNAVAILABLE`; neither counts as a
   contradiction.
2. One isolated extraction prompt per readable page asks what that source
   states, with the exact quote, the as-of date and possible derivation.
   Protocol instructions are authoritative; the page is fenced as untrusted.
3. Claims normalize to the request's form. A number or date counts only when
   written in a passage this node itself read (grounded claims).
4. Freshness is arithmetic on dates each node itself read, and three facts
   stay apart: the page was read (availability), it answers (claim presence),
   it is recent (freshness). A page with **no verifiable date is STALE under
   any non-zero freshness requirement — never CURRENT** — and counts only
   when the request explicitly lets stale evidence contribute. A source dated
   after the observation beyond the one-day tolerance is `CONFLICTING`.
5. The policy runs in code over independence groups. Outcome:
   `RESOLVED` with a state, `UNRESOLVED_CONFLICT`, or
   `UNRESOLVED_INSUFFICIENT`.

Validators repeat all of it and compare the fingerprint; passages must be
present figure-masked in their own copy; numbers must sit within tolerance.

**Two digests per source, two different jobs.** Every readable source records
both, computed over the WHOLE extracted page before any excerpt truncation:

- `text_sha256_exact` — the UNMASKED SHA-256 of the page exactly as read.
  This is historical provenance: it identifies the precise content a stored
  quotation came from, including its figures. It is deliberately **not** a
  consensus equality criterion, because two honest fetches of a live page can
  differ in figures alone.
- `text_sha256_masked` — the figure-masked SHA-256 of the same page. This one
  joins the consensus fingerprint: unchanged words agree across honest reads
  even when counters tick; changed words do not.

The validator's provenance check accepts a leader's stored digest only when
it equals its own exact read, or when the two masked digests match (a
figures-only difference). Numeric accuracy is independently guarded by the
request's own tolerance comparison, so nothing relies on a masked digest to
establish a number.

**Coverage.** Long pages are sampled completeness-aware (head plus tail with
an explicit omission marker, `excerpted` flag stored); a claim outside the
retained regions cannot be grounded and therefore cannot be claimed.

**Date basis.** Each source records `date_basis`: `CLAIM` when the date is one
the page itself states about its own information, `SERVER` when it is the
HTTP Last-Modified header (which describes the transfer, not the claim), and
empty when neither exists. Freshness prefers the claim date; the basis is
part of the record so a reader always knows what the recency was proven by.

**Dependency cycles.** Derivation traversal is cycle-safe: a citation loop
(A republishes B, B republishes A) is detected explicitly and every member
groups under the origin of the smallest source id in the loop, so a loop
counts exactly once and reciprocal citations cannot inflate independence.

**Classification preservation.** Stored evidence rows keep their real
classification — `SUPPORTING`, `CONFLICTING`, `UNCONTESTED`, `NO_CLAIM`,
`EXCLUDED`, `UNAVAILABLE` — recomputed by the one shared classifier from the
agreed outcome; nothing is flattened to `UNAVAILABLE` in storage.

## Policies

- `MAJORITY` — a leading cluster backed by more than half of the counted
  groups, and at least `min_groups`.
- `THRESHOLD` — the backing share of counted groups reaches `threshold_bps`.
- `AUTHORITY_CONFIRMATION` — the group(s) of sources declared `OFFICIAL`
  agree, and at least `min_confirmations` other groups confirm that claim.
  A declared class is a **requester claim, not an authenticated fact**:
  authority confirmation still requires independent confirmations from
  publishers other than the declared one.
- `STRICT` — every counted group agrees; any material contradiction fails.

## Evidence status per source

`SUPPORTING`, `CONFLICTING`, `UNCONTESTED`, `NO_CLAIM`, `EXCLUDED`
(stale under this policy), `UNAVAILABLE`.

## Methods

| Write | Rule |
| ----- | ---- |
| `create_accord(question, terms_json, bond_required)` | payable; value must equal the bond; refused creations return the deposit with a recorded reason |
| `cancel_accord(accord_id)` | creator only; request never observed |
| `observe_accord(accord_id)` | inside window; no pending result; interval rule |
| `finalize_result(accord_id)` | 300 s after the proposed observation; a proposal that already outlived its validity finalizes into EXPIRED, never as current |
| `expire_result(accord_id)` | after the finalized result's validity |
| `close_accord(accord_id)` | after window end; CLOSED if a result was final, else FAILED |
| `refund_bond(accord_id)` | once REFUNDABLE; whole deposit to the creator, exactly once |

| View | Returns |
| ---- | ------- |
| `get_protocol_info()` | protocol vocabulary, bounds, counters |
| `get_accord(accord_id)` | the request with parsed terms |
| `get_result(result_id)` | one immutable result record |
| `get_results(accord_id, offset, limit)` | paged results |
| `get_history(accord_id, offset, limit)` | paged state transitions |
| `list_accords`, `list_by_creator(creator)` | paged request lists |
| `list_transitions` | every transition across requests |
| `get_returned_deposits`, `returned_for(sender)` | deposit returns with reasons |

## Errors

`[EXPECTED]` a protocol rule was not met · `[EXTERNAL]` evidence failed
uniformly · `[TRANSIENT]` network trouble · `[LLM_ERROR]` the model answered
outside the allowed form (the round rotates rather than recording).
