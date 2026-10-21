# ACCORD — Bond model

Every request carries a GEN bond, sent as the value of the creating
transaction. It exists to discourage spam and meaningless requests. It is not
a stake on the answer: the reconciliation code never reads the bond, the model
never sees it, and its size does not enter the policy.

## Custody

```
LOCKED ─── cancel_accord ───► REFUNDABLE ─── refund_bond ───► REFUNDED
        └ close_accord ───►┘                    (whole deposit to the creator,
                                                 exactly once)
```

- The contract is the custodian. No method sends GEN anywhere except to the
  recorded creator (refund) or straight back to the sender (refused creation).
- The refund goes to the **creator recorded at creation**, never to the
  caller of `refund_bond`. Anyone may trigger it; the money has one home.
- The ledger is zeroed before value moves — `bond_status` becomes `REFUNDED`
  and `bond_deposited` becomes zero before the transfer is emitted, leaving no
  re-entry window. A second refund fails in the contract's own words.
- Refunds are recorded on the request itself: `refunded_amount`,
  `refunded_at`, and the final `bond_status`.

## Refused creations

StudioNet credits the value of a refused payable transaction to the contract.
A creation the contract cannot accept (invalid terms, wrong bond amount)
therefore sends the attached GEN straight back in the same transaction and
records why — sender, amount, reason, time — in `get_returned_deposits` /
`returned_for(sender)`. The deposits index makes the refund auditable without
replaying history.

## Emitted versus confirmed

A refund *emitted* by the contract is a transfer instruction; a refund
*confirmed* is the chain accepting the transaction. The interface reports the
bond as refunded only after the transaction carrying `refund_bond` reaches
GenLayer finality, and it shows the amount recorded by the contract — not an
estimate computed client-side.

## Bounds

`MIN_BOND = 10^15` atto (0.001 GEN) · `MAX_BOND = 10^24` atto (10000 GEN).
The attached value must equal `bond_required` exactly; anything else is a
refused creation.
