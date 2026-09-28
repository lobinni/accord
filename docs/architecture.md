# ACCORD — Architecture

ACCORD turns conflicting external information into one state a reader can
trust, by separating three concerns that are usually merged into one invisible
server.

## The responsibility split

| Layer            | Responsibility |
| ---------------- | -------------- |
| Contract code    | Validation of every term; URL normalization; publisher grouping; freshness arithmetic; the reconciliation policy; the request state; the history; expiry; the bond. Plain code, identical on every node, no model involved. |
| GenLayer consensus | Fetching each source independently on every validator; reading what each source states; the exact passage that states it; the passage's date; whether a source republishes another. Judgement, repeated independently until it agrees. |
| The interface    | Forms, previews, wallet requests and display. It decides nothing and stores nothing; every displayed value is fetched from the contract or from the chain. |

The split is the security property. What a contract can check deterministically
never enters the non-deterministic zone. What requires judgement is never
trusted to one party. The interface holds no state, so it can lie about nothing
that is not also a lie on-chain — and everything on-chain can be re-read by
anyone.

## Why judgement must be consensus

Reading a page and reporting what it claims is judgement: models differ, pages
move, operators have interests. A single operator's reading is exactly what a
conflict calls into doubt. ACCORD repeats the reading under GenLayer's
optimistic consensus:

1. The leader node fetches every source itself, extracts the text, and asks
   its model — in one isolated prompt per source — what that source states.
2. Each validator repeats the *whole* task: its own fetch, its own extraction,
   its own model call.
3. The validator accepts only when every decision-bearing field of the
   leader's result matches its own, and when every passage the leader would
   store is present in the validator's own copy of the page.

A passage one validator did not see cannot be stored. A number the leader
invented fails the validator's own tolerance check. A page that tells the
panel "ignore other instructions" is fenced as untrusted data and recorded as
making no claim.

## What is deterministic, what is not

Deterministic (outside consensus):

- one spelling per URL and one origin per publisher;
- grouping by publisher, following declared derivation links;
- freshness arithmetic on dates each node itself read;
- the policy outcome given the evidence;
- lifecycle transitions, expiry, bond custody.

Non-deterministic (inside consensus, per validator):

- fetching each URL;
- what the page states, in the request's exact form;
- the passage; the as-of date; the derivation admission.

## Equivalence

The leader and validators compare a *fingerprint*: every decision-bearing and
stored field, canonical JSON. Numeric claims are compared separately inside
the request's tolerance band, and passages are compared figure-masked —
live pages move counters and timestamps between two honest fetches seconds
apart; their words do not.

## Source of truth per displayed value

| Displayed value            | Source of truth |
| -------------------------- | --------------- |
| Request terms, window, bond | `get_accord(accord_id)` |
| Current state              | `get_accord(...).current_state` after `finalize_result`; never a proposed result |
| Evidence and groups        | `get_result(result_id).evidence`, `.groups` |
| State history              | `get_history(accord_id)` — transitions recorded by the contract |
| Transaction stages, votes  | The chain's own consensus data for the transaction |
| Bond movements             | `bond_status`, `bond_deposited`, `refunded_amount`, `get_returned_deposits` |
| Protocol counters          | `get_protocol_info()` |

The wallet signs every write; the interface never holds a key.

## Live-only guarantee

The interface has no database, no fixture loader and no demo mode. Every
workflow resolves to contract views or to StudioNet's read-only transaction
listing:

- dashboard counters → `get_protocol_info`, `list_accords`;
- the record hall → `list_transitions`, `get_returned_deposits`;
- a request page → `get_accord`, `get_result(s)`, `get_history`, plus the
  chain's own transaction behind each result;
- creation → `create_accord` with the bond as transaction value, reconciled
  against `list_by_creator` / `returned_for`;
- every act → the matching write method, considered done only when the
  request's own view reflects it.

Refresh any page at any time: what returns is the record, unchanged, because
the record is never here — it is on-chain.
