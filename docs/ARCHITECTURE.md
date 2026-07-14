# Arc Bridge — Architecture, Security & Monetization

**Product:** Public USDC bridge UI → **Arc** (testnet first, mainnet-ready flip)  
**Stack:** Next.js 15 (App Router) · wagmi/viem · RainbowKit · Circle App Kit / CCTP v2  
**Deploy v0:** Vercel (private GitHub repo) · client-side wallet only  

---

## 1. How you make money

| Path | How | Notes |
|---|---|---|
| **A. Circle App Kit `customFee` (primary)** | User signs `amount + fee`. Fee split on **source** chain: **90% → your `FEE_RECIPIENT`**, **10% → Circle**. Transfer amount still goes full through CCTP. | Official. No custody of user funds. Testnet: set bps low (e.g. 10–30 bps) for UX. Mainnet: 5–25 bps competitive. |
| **B. Referral / partner** | Later: wallet, faucet, explorer affiliate | Secondary |
| **C. Premium UX** | Fast lane (CCTP FAST maxFee), priority support, white-label | Post-PMF |
| **D. Do NOT** | Hold user keys, run hot-wallet custodian, fake “gasless” with your PK in browser | Security + liability |

**Fee math (example):** bridge **100 USDC**, custom fee **0.20 USDC** (20 bps of amount):

- User pays **100.20 USDC** on source (+ ETH gas)
- You receive **0.18 USDC** (90%)
- Circle receives **0.02 USDC** (10% of custom fee)
- CCTP moves **100 USDC**; protocol FAST fee (if any) comes out of the 100; STANDARD/SLOW often 0 protocol fee
- Destination ≈ 100 − protocol fee − **forwarder fee** (if `useForwarder: true`)

**Arc bootstrap:** destination gas = USDC. Always default **`useForwarder: true`** when Arc balance is 0 (proven in our drill). After user has Arc USDC, optional self-mint to save forwarder fee.

---

## 2. Architecture (secure by default)

```
┌──────────── Browser (Vercel static/SSR) ────────────┐
│  RainbowKit connect → wallet EIP-1193 provider       │
│  createViemAdapterFromProvider(window.ethereum)      │
│  AppKit.bridge({ from, to: Arc + useForwarder,       │
│    amount, config: { customFee, transferSpeed } })   │
│  NO private keys · NO fee recipient secrets in client│
│  FEE_RECIPIENT + FEE_BPS from public env only        │
└───────────────────────┬─────────────────────────────┘
                        │ user signs approve + burn
                        ▼
              Source chain (Sepolia / Base Sepolia)
                        │ CCTP attestation
                        ▼
              Arc Testnet mint (Circle forwarder)
```

| Layer | Responsibility |
|---|---|
| **UI** | Circle-inspired faucet layout + Astryx-clean density: network select, amount, fee breakdown, connect, progress |
| **Wallet** | User-controlled only (`createViemAdapterFromProvider`) |
| **Bridge** | Circle App Kit CCTP v2 + optional Gateway/forwarder |
| **Fee** | `config.customFee = { value, recipientAddress }` |
| **Server** | Optional later: rate-limit analytics, allowlist fee bps — **not required for v0** |
| **Secrets** | None in repo. WalletConnect project id optional. Never ship operator PK. |

### Security checklist (v0)

- [x] No private keys in frontend or env for bridging
- [x] Fee recipient is a **cold/ops EOA** you control (canonical or dedicated fee wallet)
- [x] Amount + fee shown **before** sign (informed consent)
- [x] Cap fee bps in code (`MAX_FEE_BPS`) so misconfig cannot drain via absurd fee
- [x] `useForwarder` default on for Arc
- [x] Testnet banner + “no real value” disclaimer
- [ ] Mainnet: legal ToS, domain allowlist WalletConnect, CSP headers on Vercel
- [ ] Optional: server-side quote log (no PII beyond address)

---

## 3. Testnet vs mainnet flip

| Item | Testnet (now) | Mainnet (when Arc live) |
|---|---|---|
| Env | `NEXT_PUBLIC_NETWORK=testnet` | `mainnet` |
| Source chains | `Ethereum_Sepolia`, `Base_Sepolia` | `Ethereum`, `Base`, … |
| Destination | `Arc_Testnet` | Arc mainnet chain name from App Kit |
| USDC addresses | Sepolia/Base Sepolia test USDC | Mainnet USDC |
| WalletConnect / RPC | Public RPCs OK | Paid RPC (Alchemy/QuickNode) |
| Fee bps | 10–30 demo | Competitive 5–25 |
| Disclaimer | Testnet tokens | Real funds ToS |
| Domain | Vercel preview | Production domain + WC allowlist |

See `docs/MAINNET-FLIP.md`.

---

## 4. Repo & deploy

- **GitHub:** private under `neoresearchme` (or org)
- **Vercel:** import private repo, set `NEXT_PUBLIC_*` only
- **Local preview:** `npm run dev` + `cloudflared tunnel --url http://localhost:3000`

---

## 5. Out of scope v0

- Mobile native
- Solana sources
- Custodial relayer with your hot key
- Fiat on-ramp (use Circle/other later)
