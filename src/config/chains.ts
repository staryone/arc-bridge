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
  | "Arc"; // placeholder — confirm exact string when Arc mainnet is in App Kit

export type SourceOption = {
  id: string;
  label: string;
  circleName: CircleChainName;
  chain: Chain;
  usdc: `0x${string}`;
  explorer: string;
  nativeSymbol: string;
};

/** Arc destination (testnet proven: chain id 5042002) */
export const ARC_DEST = IS_TESTNET
  ? {
      circleName: "Arc_Testnet" as CircleChainName,
      label: "Arc Testnet",
      chainId: 5042002,
      rpc: "https://rpc.testnet.arc.network",
      usdc: "0x3600000000000000000000000000000000000000" as `0x${string}`,
      explorer: "https://testnet.arcscan.app",
      /** gas token = USDC native on Arc */
      gasIsUsdc: true,
    }
  : {
      circleName: "Arc" as CircleChainName,
      label: "Arc",
      chainId: 0, // TODO mainnet
      rpc: "",
      usdc: "0x" as `0x${string}`,
      explorer: "",
      gasIsUsdc: true,
    };

export const SOURCE_OPTIONS: SourceOption[] = IS_TESTNET
  ? [
      {
        id: "eth-sepolia",
        label: "Ethereum Sepolia",
        circleName: "Ethereum_Sepolia",
        chain: sepolia,
        usdc: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
        explorer: "https://sepolia.etherscan.io",
        nativeSymbol: "ETH",
      },
      {
        id: "base-sepolia",
        label: "Base Sepolia",
        circleName: "Base_Sepolia",
        chain: baseSepolia,
        usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        explorer: "https://sepolia.basescan.org",
        nativeSymbol: "ETH",
      },
    ]
  : [
      // Mainnet stubs — fill when flipping
      {
        id: "ethereum",
        label: "Ethereum",
        circleName: "Ethereum",
        chain: sepolia, // replace with mainnet chain import
        usdc: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        explorer: "https://etherscan.io",
        nativeSymbol: "ETH",
      },
    ];

/** Fee: bps of transfer amount, charged ON TOP (not deducted from amount) */
export const FEE_BPS = Math.min(
  Number(process.env.NEXT_PUBLIC_FEE_BPS || "20"),
  Number(process.env.NEXT_PUBLIC_MAX_FEE_BPS || "100")
);

/** Hard cap so misconfig cannot set absurd fees */
export const MAX_FEE_BPS = Number(process.env.NEXT_PUBLIC_MAX_FEE_BPS || "100");

/**
 * Where 90% of customFee goes (10% always to Circle via App Kit).
 * Default = operator canonical wallet; override with NEXT_PUBLIC_FEE_RECIPIENT.
 */
export const FEE_RECIPIENT = (process.env.NEXT_PUBLIC_FEE_RECIPIENT ||
  "0xe85dCc8c424089c03F46DC7177B93689613132b7") as `0x${string}`;

export const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME || "Arc Bridge";

export function feeFromAmount(amount: string): string {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) return "0";
  const bps = Math.min(Math.max(FEE_BPS, 0), MAX_FEE_BPS);
  const fee = (n * bps) / 10_000;
  // USDC 6 decimals display — keep 6 max
  return fee.toFixed(6).replace(/\.?0+$/, "") || "0";
}

export function youReceiveFromFee(feeStr: string): string {
  const f = Number(feeStr);
  if (!Number.isFinite(f)) return "0";
  return ((f * 90) / 100).toFixed(6).replace(/\.?0+$/, "") || "0";
}
