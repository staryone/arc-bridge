# Arc Bridge

Non-custodial **USDC → Arc** web bridge (Circle CCTP v2 / App Kit).

- **UI:** Circle faucet + Coinbase-clean (DM Sans, `#0052ff` pills)
- **Network now:** Testnet (Sepolia / Base Sepolia → Arc Testnet)
- **Monetization:** App Kit `customFee` — user pays amount + fee; **90% to your `FEE_RECIPIENT`**, 10% Circle
- **Security:** browser wallet only · no operator private keys · fee bps hard-capped

## Docs

- [Architecture & monetization](./docs/ARCHITECTURE.md)
- [Mainnet flip](./docs/MAINNET-FLIP.md)

## Dev

```bash
cp .env.example .env.local
npm install
npm run dev
# optional public preview:
cloudflared tunnel --url http://localhost:3000
```

## Deploy (Vercel)

1. Import this **private** GitHub repo
2. Set `NEXT_PUBLIC_*` from `.env.example`
3. Build command: `npm run build` · output: Next default

## Stack

Next.js 15 · wagmi 2 · RainbowKit · viem · `@circle-fin/app-kit` · `@circle-fin/adapter-viem-v2`
