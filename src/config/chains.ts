import { baseSepolia, sepolia, type Chain } from "viem/chains";

/** App environment — flip via NEXT_PUBLIC_NETWORK=mainnet when Arc mainnet ships */
export const NETWORK =
  (process.env.NEXT_PUBLIC_NETWORK as "testnet" | "mainnet") || "testnet";

export const IS_TESTNET = NETWORK !== "mainnet";

/** Circle App Kit chain name strings (must match @circle-fin/app-kit) */
export type CircleChainName =
  | "Ethereum_Sepolia"
  | "Base_Sepolia"
  | "Arc_Testnet"
  | "Ethereum"
  | "Base"
  | "Arc";

export type ChainOption = {
  id: string;
  label: string;
  short: string;
  circleName: CircleChainName;
  chain: Chain;
  /** ERC-20 USDC; null = native USDC (Arc) */
  usdc: `0x${string}` | null;
  explorer: string;
  nativeSymbol: string;
  /** Arc: gas token is USDC native */
  isArc?: boolean;
};

/** Custom Arc Testnet chain for wagmi (not in stock viem) */
export const arcTestnet = {
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://rpc.testnet.arc.network"] },
  },
  blockExplorers: {
    default: { name: "Arcscan", url: "https://testnet.arcscan.app" },
  },
  testnet: true,
} as const satisfies Chain;

export const ARC_CHAIN: ChainOption = IS_TESTNET
  ? {
      id: "arc-testnet",
      label: "Arc Testnet",
      short: "Arc",
      circleName: "Arc_Testnet",
      chain: arcTestnet,
      usdc: null,
      explorer: "https://testnet.arcscan.app",
      nativeSymbol: "USDC",
      isArc: true,
    }
  : {
      id: "arc",
      label: "Arc",
      short: "Arc",
      circleName: "Arc",
      chain: arcTestnet,
      usdc: null,
      explorer: "",
      nativeSymbol: "USDC",
      isArc: true,
    };

/** External EVM chains that can send/receive vs Arc */
export const EVM_OPTIONS: ChainOption[] = IS_TESTNET
  ? [
      {
        id: "eth-sepolia",
        label: "Ethereum Sepolia",
        short: "ETH",
        circleName: "Ethereum_Sepolia",
        chain: sepolia,
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        explorer: "https://sepolia.etherscan.io",
        nativeSymbol: "ETH",
      },
      {
        id: "base-sepolia",
        label: "Base Sepolia",
        short: "Base",
        circleName: "Base_Sepolia",
        chain: baseSepolia,
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        explorer: "https://sepolia.basescan.org",
        nativeSymbol: "ETH",
      },
    ]
  : [
      {
        id: "ethereum",
        label: "Ethereum",
        short: "ETH",
        circleName: "Ethereum",
        chain: sepolia,
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        explorer: "https://etherscan.io",
        nativeSymbol: "ETH",
      },
    ];

/** @deprecated use EVM_OPTIONS — kept for any old imports */
export const SOURCE_OPTIONS = EVM_OPTIONS;
export const ARC_DEST = {
  circleName: ARC_CHAIN.circleName,
  label: ARC_CHAIN.label,
  chainId: ARC_CHAIN.chain.id,
  rpc: ARC_CHAIN.chain.rpcUrls.default.http[0] || "",
  usdc: "0x3600000000000000000000000000000000000000" as `0x${string}`,
  explorer: ARC_CHAIN.explorer,
  gasIsUsdc: true,
};

/**
 * Platform fee tiers (bps of transfer amount, charged ON TOP).
 * Industry: many bridges take ~5–30 bps; CCTP wrappers often 10–25.
 * Circle always takes 10% of customFee; you keep 90%.
 *
 * Defaults (competitive + profitable):
 * - Standard 15 bps → you ~13.5 bps net
 * - Fast 25 bps → you ~22.5 bps net
 * - Extreme 40 bps → you ~36 bps net (priority buffer, not magically faster than Fast)
 */
export type SpeedId = "standard" | "fast" | "extreme";

export type SpeedTier = {
  id: SpeedId;
  label: string;
  eta: string;
  /** CCTP only supports SLOW | FAST — Extreme still uses FAST */
  transferSpeed: "SLOW" | "FAST";
  feeBps: number;
  /**
   * Optional maxFee headroom (USDC string) for FAST burns.
   * Extreme sets a higher cap so fee spikes don't fail the burn.
   * Leave undefined to let App Kit auto-estimate.
   */
  maxFee?: string;
  blurb: string;
  /** Honest: Extreme ≠ faster finality than Fast on CCTP */
  honestNote?: string;
};

const envBps = (key: string, fallback: number) => {
  const n = Number(process.env[key] ?? fallback);
  return Number.isFinite(n) ? n : fallback;
};

export const MAX_FEE_BPS = envBps("NEXT_PUBLIC_MAX_FEE_BPS", 100);

export const SPEED_TIERS: Record<SpeedId, SpeedTier> = {
  standard: {
    id: "standard",
    label: "Standard",
    eta: "15–30 min",
    transferSpeed: "SLOW",
    feeBps: Math.min(envBps("NEXT_PUBLIC_FEE_BPS_STANDARD", 15), MAX_FEE_BPS),
    blurb: "Full finality · lowest fee · 0 CCTP protocol fee",
  },
  fast: {
    id: "fast",
    label: "Fast",
    eta: "~8–20 sec",
    transferSpeed: "FAST",
    feeBps: Math.min(envBps("NEXT_PUBLIC_FEE_BPS_FAST", 25), MAX_FEE_BPS),
    blurb: "CCTP fast burn · protocol fee ~1–14 bps extra on amount",
  },
  extreme: {
    id: "extreme",
    label: "Extreme",
    eta: "~8–20 sec",
    transferSpeed: "FAST",
    feeBps: Math.min(envBps("NEXT_PUBLIC_FEE_BPS_EXTREME", 40), MAX_FEE_BPS),
    // Higher headroom for burn+forwarder under fee spikes (not faster finality)
    maxFee: process.env.NEXT_PUBLIC_EXTREME_MAX_FEE || undefined,
    blurb: "FAST path + higher fee cap + higher service fee",
    honestNote:
      "Same CCTP FAST finality as Fast. Pays more service fee + optional higher maxFee headroom so burns are less likely to fail under spikes.",
  },
};

/** Legacy single FEE_BPS (standard) for docs */
export const FEE_BPS = SPEED_TIERS.standard.feeBps;

export const FEE_RECIPIENT = (process.env.NEXT_PUBLIC_FEE_RECIPIENT ||
  "0xe85dCc8c424089c03F46DC7177B93689613132b7") as `0x${string}`;

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Arc Bridge";

export function feeFromAmount(amount: string, feeBps: number): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "0";
  const bps = Math.min(Math.max(feeBps, 0), MAX_FEE_BPS);
  const fee = (n * bps) / 10_000;
  return fee.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function youReceiveFromFee(feeStr: string): string {
  const f = Number(feeStr);
  if (!Number.isFinite(f)) return "0";
  return ((f * 90) / 100).toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function chainById(id: string): ChainOption | undefined {
  if (id === ARC_CHAIN.id) return ARC_CHAIN;
  return EVM_OPTIONS.find((c) => c.id === id);
}
