# ACCORD — Wallet, network and GEN guide

How to get a wallet talking to StudioNet in under five minutes, plus the
troubleshooting table for everything that commonly goes wrong.

## 1. Install and connect

1. Install **MetaMask** (browser extension) or any EIP-6963 wallet (Rabby…).
2. Open the interface and choose **Connect wallet**.
3. Pick MetaMask from the discovered list. The app never asks for a seed
   phrase or key — it only receives your public address and asks the wallet
   to sign transactions.

- [ ] The header shows your shortened address.

## 2. Put the wallet on StudioNet (chain 61999)

The first time, a pill offers **Switch to StudioNet · 61999**:

- Approve `wallet_switchEthereumChain` in MetaMask. If MetaMask has never
  seen the network, the app sends `wallet_addEthereumChain` with:

  | Field | Value |
  | ----- | ----- |
  | Network name | GenLayer StudioNet |
  | RPC URL | https://studio.genlayer.com/api |
  | Chain ID | 61999 |
  | Currency symbol | GEN |
  | Block explorer | https://explorer-studio.genlayer.com |

- [ ] The account popover reads "On StudioNet · ready to sign".

To add the network by hand instead: MetaMask → Settings → Networks → Add a
network manually → fill the same table.

## 3. Get test GEN

StudioNet GEN exists only for testing and is free:

1. Open the StudioNet faucet (linked from the GenLayer documentation).
2. Paste your address, request GEN.
3. Wait one consensus round (seconds to a minute) for the balance to appear.

Suggested budget for a full manual pass:

| Activity | GEN needed |
| -------- | ---------- |
| One full lifecycle (bond 0.02) | bond is refunded; only gas is spent |
| Four sample requests in sequence | four refundable bonds + gas |
| A refused-creation test | refunded in the same transaction |

## 4. Two-account tests (recommended)

Several walls need a second pair of eyes on your own request:

1. In MetaMask, create/use a **second account**.
2. Switch MetaMask's active account; the header follows instantly (account
   changes are watched).
3. Open a request created by account A with account B active:
   - [ ] The *Cancel the request* act is present but disabled, with the reason
     that only the creator may cancel.
   - [ ] *Observe now*, *Finalize*, *Close* and *Refund* remain usable by
     anyone — and the refund still pays account A, never account B.

## 5. Troubleshooting

| Symptom | Meaning | Fix |
| ------- | ------- | --- |
| "No injected wallet was found" | The browser has no EIP-6963/EIP-1193 wallet | Install MetaMask, reload, retry; on mobile, use the MetaMask in-app browser |
| Amber network pill | Wallet sits on another chain | Press it once; approve the switch in MetaMask |
| "Not enough GEN" | Balance below bond + gas | Faucet again; the bond is refunded, gas is not |
| Signature popover never opens | A previous request is pending | Open MetaMask manually and clear/approve it |
| "The contract refused: …" | A protocol rule blocked the act | Read the sentence — it is the contract's own reason (time gates, creator walls, bond bounds) |
| An act is disabled | Its gate is closed right now | Its reason appears under it (window, interval, creator-only, custody state) |
| Counters show "—" | The read is quiet for a moment | They repoll automatically; GEN faucet and RPC outages are transient |

## 6. Privacy notes

- The wallet is the only identity; disconnecting clears the session locally.
- Nothing you type is stored anywhere by the interface: the request's data
  lives exclusively in the contract transaction you signed.
- Never paste a seed phrase anywhere; neither the app nor the faucet will
  ever ask for one.
