# Arc mainnet flip guide

Last evidence pass: **2026-07-14** (arcdexscan + Blockdaemon RPC + App Kit package inspect).

## Short answer

**Blockdaemon RPC (`https://rpc.blockdaemon.mainnet.arc.io`) is enough to talk to Arc L1 chainId 5042** (wallet add-chain, eth_call, DEX, balances).

**It is NOT enough to run a production Circle CCTP bridge** with current `@circle-fin/app-kit`:

| Layer | Status on 5042 | Bridge needs it? |
|---|---|---|
| JSON-RPC (Blockdaemon) | LIVE chainId 5042 | Yes (wallet + reads) |
| USDC `0x3600…` | LIVE | Yes |
| CCTP V2 contracts (alt addresses) | LIVE domain **26** | Yes |
| App Kit chain string `Arc` mainnet | **MISSING** (only `Arc_Testnet` / 5042002) | **Yes for our stack** |
| App Kit testnet CCTP addrs `0x8FE6` / `0xE737` | **codesize 0** | Would break if reused |
| Kit bridge/adapter / Gateway testnet addrs | **codesize 0** | Soft (kit path) |
| Official docs mainnet table | **Not published** | Ops confidence |
| Iris attestation proven for mainnet burns | **Not proven** | Yes for mint settle |

So: **RPC ≠ bridge-ready.** Soft-live chain + partial CCTP deploy ≠ App Kit product path.

## Discovered mainnet CCTP (5042)

```
TokenMessenger     0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d
MessageTransmitter 0x81D40F21F12A8F0E3252Bccb954D722d4c464B64  localDomain()=26
TokenMinter        0xfd78EE919681417d192449715b2594ab58f5D002
USDC               0x3600000000000000000000000000000000000000
RPC                https://rpc.blockdaemon.mainnet.arc.io
```

App Kit **testnet** config still points at different messengers (`0x8FE6…`, `0xE737…`) on chain **5042002**.

## When to set `NEXT_PUBLIC_NETWORK=mainnet`

Only after `MAINNET_READINESS.bridgeReady === true` in `src/config/mainnet.ts`, typically:

1. `@circle-fin/bridge-kit` / `app-kit` release includes Arc mainnet (`chainId: 5042` + CCTP addrs matching on-chain).
2. Official `docs.arc.io` publishes mainnet contract table.
3. Operator completes **one** burn → Iris attestation → mint on 5042 (or reverse) with real USDC.
4. Real WalletConnect project id + domain allowlist.
5. Production host (Vercel/domain), not `next dev` / ephemeral tunnel.

## Experimental mode

```bash
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_MAINNET_EXPERIMENTAL=1
NEXT_PUBLIC_ARC_MAINNET_RPC=https://rpc.blockdaemon.mainnet.arc.io
```

- Exposes mainnet **wallet chain** + UI chrome.
- **Does not** claim CCTP works.
- Bridge button should stay blocked / warn until App Kit supports Arc mainnet.

## Code map

| File | Role |
|---|---|
| `src/config/mainnet.ts` | Constants + readiness matrix |
| `src/config/chains.ts` | Switches Arc + EVM options by `NETWORK` |
| `src/config/wagmi.ts` | Wallet chains for mainnet |
| `src/lib/bridge.ts` | `isArcChain` includes `"Arc"`; still needs App Kit string |
| `docs/MAINNET-FLIP.md` | This file |

## Flip checklist

- [ ] App Kit version ships Arc mainnet chain id
- [ ] Update `CircleChainName` with official string
- [ ] Set `MAINNET_READINESS` rows true after re-probe
- [ ] `NEXT_PUBLIC_NETWORK=mainnet` on prod only
- [ ] WC project id live
- [ ] Fee recipient funded / monitored on mainnet
- [ ] Smoke: ETH/Base → Arc + reverse, forwarder ON
- [ ] Remove experimental flag

## Probe one-liners

```bash
RPC=https://rpc.blockdaemon.mainnet.arc.io
cast chain-id --rpc-url $RPC          # expect 5042
cast call 0x81D40F21F12A8F0E3252Bccb954D722d4c464B64 'localDomain()(uint32)' --rpc-url $RPC  # 26
cast codesize 0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA --rpc-url $RPC  # 0 (testnet addr)
cast codesize 0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d --rpc-url $RPC  # >0 mainnet TM
```
