# Security model — Arc Bridge

## Trust boundary

| Component | Trust |
|---|---|
| User wallet (MetaMask etc.) | **User-controlled.** Signs approve + burn. Keys never leave wallet. |
| This website (Vercel / tunnel) | **Untrusted surface.** Only builds tx params via Circle App Kit. No custody. |
| Circle CCTP + App Kit | **Protocol.** Mint/burn + attestation. Official contracts. |
| `FEE_RECIPIENT` | Operator EOA receives **90% of customFee only** (not transfer amount). |

## Guarantees (v0)

1. **No private keys** in browser env, Vercel env, or repo (only public `NEXT_PUBLIC_*`).
2. **No server-side signing** of user funds.
3. **Fee is additive** (`amount + customFee`), not a hidden deduction from the bridge amount.
4. **Fee bps hard-capped** (`MAX_FEE_BPS`, default 100).
5. **Forwarder always on for Arc dest** — prevents "stuck mint" when Arc balance is 0 (gas=USDC).
6. **UI always unlocks** after promise settle / terminal event / manual unlock / 15m timeout.

## What we do NOT do

- Hold user USDC in a hot wallet
- Ask for seed / private key
- Infinite USDC approve without user signature (wallet shows allowance)
- Claim "Extreme" is faster than CCTP FAST finality (same path; higher service fee + optional maxFee headroom)

## Threats & mitigations

| Threat | Mitigation |
|---|---|
| Malicious deploy of this frontend | Use private repo + Vercel team access; pin domain; users verify fee recipient in UI |
| Fee recipient swapped in malicious build | Show full `FEE_RECIPIENT` in UI; open-source later; users compare |
| Phishing domain | WalletConnect allowlist on mainnet; educate users |
| Stuck UI after success | `finally` + terminal event unlock + manual unlock |
| Absurd fee | `MAX_FEE_BPS` + tier defaults ≤ 40 |
| Arc zero gas chicken-egg | Always `useForwarder: true` on Arc destination |

## Mainnet checklist

- [x] Security headers in `next.config.ts` (CSP, XFO, XCTO, Referrer, Permissions, HSTS in prod)
- [x] `poweredByHeader: false` + no production browser source maps
- [x] Public preview via `next build && next start` (never expose `next dev` / HMR)
- [x] Mainnet config skeleton + readiness gate (`src/config/mainnet.ts`, `docs/MAINNET-FLIP.md`)
- [x] `kit.bridge("Arc")` hard-blocked until App Kit ships Arc mainnet
- [ ] Real WalletConnect project ID + domain allowlist (`NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`)
- [ ] Fee recipient = cold/ops wallet, not day-trading hot key
- [ ] Small live dry-run each route (after App Kit Arc mainnet)
- [ ] ToS if charging fees
- [ ] Stable domain (not trycloudflare) + CDN (Vercel)
- [ ] `MAINNET_READINESS.bridgeReady === true` before `NEXT_PUBLIC_NETWORK=mainnet` on public prod

**Note:** Blockdaemon RPC alone ≠ CCTP bridge-ready. See `docs/MAINNET-FLIP.md`.
