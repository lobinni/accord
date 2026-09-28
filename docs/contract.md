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
4. Freshness is arithmetic: the newest grounded date versus the observation
   time and the freshness requirement. A source dated after the observation
   beyond the one-day tolerance is `CONFLICTING`.
5. The policy runs in code over independence groups. Outcome:
   `RESOLVED` with a state, `UNRESOLVED_CONFLICT`, or
   `UNRESOLVED_INSUFFICIENT`.

Validators repeat all of it and compare the fingerprint; passages must be
present figure-masked in their own copy; numbers must sit within tolerance.

## Policies

- `MAJORITY` — a leading cluster backed by more than half of the counted
  groups, and at least `min_groups`.
- `THRESHOLD` — the backing share of counted groups reaches `threshold_bps`.
- `AUTHORITY_CONFIRMATION` — the group(s) of sources declared `OFFICIAL`
  agree, and at least `min_confirmations` other groups confirm that claim.
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
| `finalize_result(accord_id)` | 300 s after the proposed observation |
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
