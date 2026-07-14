"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { base, baseSepolia, mainnet, sepolia } from "wagmi/chains";
import {
  arcMainnet,
  arcTestnet,
  canExposeMainnetUi,
  IS_TESTNET,
} from "./chains";

/**
 * WalletConnect Cloud project id (https://cloud.walletconnect.com).
 * Injected wallets (MetaMask/Rabby) work without a real WC id for local connect;
 * WalletConnect QR / mobile deep-link needs a real project id + domain allowlist.
 *
 * F-003: do not invent a fake id that looks production-ready.
 */
const rawId = (process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "").trim();
const projectId =
  rawId && !rawId.startsWith("demo_")
    ? rawId
    : // RainbowKit requires non-empty string; this is explicitly test-only
      "00000000000000000000000000000000";

if (typeof window !== "undefined" && (!rawId || rawId.startsWith("demo_"))) {
  // once per session
  const k = "__arc_wc_warn";
  if (!(window as unknown as Record<string, boolean>)[k]) {
    console.warn(
      "[arc-bridge] NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID missing or demo_*. " +
        "Set a real id from cloud.walletconnect.com before mainnet."
    );
    (window as unknown as Record<string, boolean>)[k] = true;
  }
}

const mainnetChains = canExposeMainnetUi()
  ? ([mainnet, base, arcMainnet] as const)
  : // NETWORK=mainnet but not ready: still list ETH/Base mainnet + testnet Arc for kit
    ([mainnet, base, arcTestnet] as const);

export const wagmiConfig = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Arc Bridge",
  projectId,
  chains: IS_TESTNET
    ? ([sepolia, baseSepolia, arcTestnet] as const)
    : mainnetChains,
  ssr: true,
});
