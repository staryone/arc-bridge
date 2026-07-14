# Mainnet flip checklist

When Arc mainnet is live in Circle App Kit / CCTP:

## Env (Vercel)

```
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_FEE_BPS=15
NEXT_PUBLIC_MAX_FEE_BPS=50
NEXT_PUBLIC_FEE_RECIPIENT=0xYourColdOrOpsWallet
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=real_wc_id
NEXT_PUBLIC_APP_NAME=Arc Bridge
```

## Code touchpoints

| File | Change |
|---|---|
| `src/config/chains.ts` | `IS_TESTNET=false` path: set real Arc mainnet `circleName`, `chainId`, `rpc`, `usdc`, `explorer`. Import `mainnet` / `base` from `viem/chains` for sources. |
| `src/config/wagmi.ts` | Replace `sepolia, baseSepolia` with mainnet chains. |
| UI | Remove/soften testnet banner; link real faucet only if any; ToS. |
| Fee | Lower bps if competing; keep `MAX_FEE_BPS` hard cap. |
| RPC | Prefer Alchemy/QuickNode in adapter `getPublicClient` if public RPCs flake. |

## Confirm with Circle docs

1. Exact App Kit chain string for Arc mainnet (may be `Arc` or `Arc_Mainnet`).
2. CCTP domain id + TokenMessenger / MessageTransmitter addresses (App Kit embeds these if route supported).
3. Forwarder / Gas Station still required for zero-balance dest? If yes, keep `useForwarder` default true for first-time users.

## Security before public mainnet

- [ ] WalletConnect domain allowlist
- [ ] CSP headers on Vercel
- [ ] Fee recipient is NOT a day-trading hot wallet with huge allowance surface
- [ ] No private keys in env / repo
- [ ] Manual dry-run with small USDC on each source → Arc
- [ ] Legal disclaimer / ToS if charging fees

## Do not change

- Fee model: `config.customFee` stays on-top-of-amount
- User-controlled adapter only (`createViemAdapterFromProvider`)
- No custodian path
