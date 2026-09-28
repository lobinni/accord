# ACCORD — Deployment

Target network: **GenLayer StudioNet**, chain id **61999**, RPC
`https://studio.genlayer.com/api`, explorer
`https://explorer-studio.genlayer.com`.

## Deployment of record

| | |
| - | - |
| Address | `0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56` |
| Explorer | https://explorer-studio.genlayer.com/address/0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56` |
| Protocol | `ACCORD-1.0.0` (all 17 methods verified answering live) |
| Source | `contracts/accord.py` |
| Verify | `python scripts/verify_deployment.py 0xF6cbD783355B209b9B37bc977Fc7DC14C86a2a56` |

Machine-readable form: [deployment.json](deployment.json). Every successful
`scripts/deploy.py` run rewrites both.

## Deploying

```bash
pip install -r requirements.txt
export ACCORD_DEPLOYER_KEY=<deployer private key>   # local shell only, never committed
python scripts/deploy.py
```

The deploy script:

1. reads `contracts/accord.py` locally;
2. sends the deployment transaction and waits for GenLayer finality;
3. fetches the stored code from the chain and proves it byte-identical to the
   local file (hash comparison, no trust in the receipt);
4. writes `docs/deployment.json` with the address, transaction, code hash,
   block and timestamp.

## Verifying an existing deployment

```bash
python scripts/verify_deployment.py 0xYourContractAddress
```

Verification needs nothing but the address: it pulls the code stored on-chain
and the local contract, compares hashes, and prints the protocol info read
live from the contract (`ACCORD-1.0.0`, vocabularies, bounds, counters).

## Pointing the interface at a deployment

The address of record is built into `src/lib/genlayer/config.ts`
(`DEFAULT_CONTRACT_ADDRESS`), so the interface serves this deployment with no
environment at all. To serve a **different** deployment, set the override and
restart — pages render on demand, so the change is immediate:

```bash
GENLAYER_NETWORK=studionet
GENLAYER_CHAIN=61999
ACCORD_CONTRACT=0xYourContractAddress
GENLAYER_RPC_URL=                # optional override
```

`src/lib/genlayer/config.ts` defines the entire reader, consumed once
server-side (`src/lib/genlayer/server-config.ts`); the interface refuses to
start against an unset or malformed address and explains why on every page
instead of guessing a contract.

## Funding

StudioNet GEN for the deployer and for request bonds is available from the
StudioNet faucet. Bond amounts in the live suite are deliberately small
(0.01–0.05 GEN); every bond in the suite is refunded at the end of its run.
