/**
 * Arc MAINNET config skeleton (chainId 5042 / 0x13b2).
 *
 * Soft-live observed 2026-07-14 via Blockdaemon + third-party indexers.
 * This module is the single source of truth for mainnet constants.
 *
 * HARD GATES (do not remove casually):
 * - App Kit (@circle-fin) currently only exports Blockchain.Arc_Testnet (5042002).
 * - There is NO "Arc" mainnet chain string in bridge-kit/app-kit yet.
 * - Testnet CCTP addresses have codesize 0 on 5042; different CCTP contracts live there.
 * - Kit bridge/adapter + Gateway addresses from testnet config are empty on 5042.
 *
 * Flip NEXT_PUBLIC_NETWORK=mainnet only after MAINNET_READINESS.bridgeReady === true
 * (or after intentional experimental mode with NEXT_PUBLIC_MAINNET_EXPERIMENTAL=1).
 */

import type { Chain } from "viem/chains";

/** Arc L1 mainnet chain id (decimal + hex) */
export const ARC_MAINNET_CHAIN_ID = 5042;
export const ARC_MAINNET_CHAIN_HEX = "0x13b2" as const;

/**
 * Public RPC that currently serves chainId 5042.
 * Official rpc.arc.* hosts were dark/401 as of 2026-07-14.
 * Prefer official Circle/Blockdaemon docs URL once published.
 */
export const ARC_MAINNET_RPC_DEFAULT =
  process.env.NEXT_PUBLIC_ARC_MAINNET_RPC ||
  "https://rpc.blockdaemon.mainnet.arc.io";

/** Explorer — arcscan.app was NXDOMAIN; leave overrideable */
export const ARC_MAINNET_EXPLORER =
  process.env.NEXT_PUBLIC_ARC_MAINNET_EXPLORER || "";

/**
 * CCTP domain observed on MessageTransmitter.localDomain() on 5042.
 * Same numeric domain as Arc Testnet (26) in App Kit — do NOT assume Iris
 * mainnet attestation is live for this domain until proven with a burn+attest.
 */
export const ARC_MAINNET_CCTP_DOMAIN = 26;

/**
 * On-chain CCTP V2 surface discovered on chain 5042 (2026-07-14).
 * NOT the same addresses as docs testnet table / App Kit Arc_Testnet config.
 *
 * TokenMessenger 0x28b5… → localMessageTransmitter 0x81D4…, localMinter 0xfd78…
 * MessageTransmitter.localDomain() === 26
 */
export const ARC_MAINNET_CCTP = {
  domain: ARC_MAINNET_CCTP_DOMAIN,
  tokenMessenger:
    "0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d" as `0x${string}`,
  messageTransmitter:
    "0x81D40F21F12A8F0E3252Bccb954D722d4c464B64" as `0x${string}`,
  tokenMinter:
    "0xfd78EE919681417d192449715b2594ab58f5D002" as `0x${string}`,
  /** App Kit testnet addresses — EMPTY on 5042 (codesize 0). Keep for contrast. */
  testnetDocsTokenMessenger:
    "0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA" as `0x${string}`,
  testnetDocsMessageTransmitter:
    "0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275" as `0x${string}`,
} as const;

/** Native USDC ERC-20 interface (same precompile-style address as testnet) */
export const ARC_MAINNET_USDC =
  "0x3600000000000000000000000000000000000000" as `0x${string}`;

/**
 * Circle App Kit chain identifier for Arc mainnet.
 * UNKNOWN until bridge-kit ships it — placeholder only.
 * Do not pass this to kit.bridge() until readiness.bridgeReady.
 */
export const ARC_MAINNET_CIRCLE_NAME_PLACEHOLDER = "Arc" as const;

/** wagmi/viem chain definition for Arc mainnet */
export const arcMainnet = {
  id: ARC_MAINNET_CHAIN_ID,
  name: "Arc",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: [ARC_MAINNET_RPC_DEFAULT] },
  },
  blockExplorers: {
    default: {
      name: "Arcscan",
      // Prefer env once official explorer ships; empty host breaks some wallets
      url: ARC_MAINNET_EXPLORER || "https://arcscan.app",
    },
  },
  testnet: false,
} as const satisfies Chain;

/**
 * Readiness matrix — source of truth for "can we bridge for real?"
 * Update rows when Circle ships App Kit Arc mainnet / official docs flip.
 */
export type MainnetReadiness = {
  /** Blockdaemon (or official) RPC returns chainId 5042 */
  rpcLive: boolean;
  /** USDC interface + gas model present */
  usdcLive: boolean;
  /** CCTP TokenMessenger/MessageTransmitter with code on 5042 */
  cctpContractsLive: boolean;
  /** App Kit exports Arc mainnet chain string (not only Arc_Testnet) */
  appKitChainString: boolean;
  /** Official docs list mainnet contract addresses */
  officialDocsMainnet: boolean;
  /** Proven Iris attestation for a mainnet burn (operator test) */
  irisAttestationProven: boolean;
  /** Kit bridge/adapter contracts deployed (or App Kit pure CCTP path OK) */
  kitContractsLive: boolean;
  /**
   * Product gate: all required rows true.
   * RPC-only is never enough for production CCTP bridge UI.
   */
  bridgeReady: boolean;
};

/**
 * Snapshot as of 2026-07-14 (arcdexscan recon + cast probes).
 * Re-run scripts/check-mainnet-readiness.sh (or docs checklist) to refresh.
 */
export const MAINNET_READINESS: MainnetReadiness = {
  rpcLive: true,
  usdcLive: true,
  cctpContractsLive: true,
  appKitChainString: false, // only Arc_Testnet in @circle-fin/* today
  officialDocsMainnet: false, // docs: "Mainnet addresses are not yet available"
  irisAttestationProven: false,
  kitContractsLive: false, // testnet kit bridge/adapter/gateway codesize 0 on 5042
  // Computed: need App Kit string + (kit or raw CCTP path) + iris proven for prod
  bridgeReady: false,
};

/** Env escape hatch for lab experiments — never enable on public prod without review */
export const MAINNET_EXPERIMENTAL =
  process.env.NEXT_PUBLIC_MAINNET_EXPERIMENTAL === "1" ||
  process.env.NEXT_PUBLIC_MAINNET_EXPERIMENTAL === "true";

/**
 * Whether the UI may present mainnet as "live bridge".
 * Experimental mode only unlocks UI chrome / wallet chain — not a claim of CCTP success.
 */
export function canExposeMainnetUi(): boolean {
  return MAINNET_READINESS.bridgeReady || MAINNET_EXPERIMENTAL;
}

export function mainnetBlockers(): string[] {
  const r = MAINNET_READINESS;
  const out: string[] = [];
  if (!r.rpcLive) out.push("RPC chainId 5042 not live");
  if (!r.usdcLive) out.push("USDC interface missing on mainnet");
  if (!r.cctpContractsLive) out.push("CCTP contracts missing on 5042");
  if (!r.appKitChainString)
    out.push(
      "Circle App Kit has no Arc mainnet chain id (only Arc_Testnet / 5042002)"
    );
  if (!r.officialDocsMainnet)
    out.push("docs.arc.io still testnet-only for contract addresses");
  if (!r.irisAttestationProven)
    out.push("Iris mainnet attestation for Arc domain unproven");
  if (!r.kitContractsLive)
    out.push(
      "App Kit bridge/adapter (+ Gateway) addresses from testnet empty on 5042"
    );
  return out;
}
