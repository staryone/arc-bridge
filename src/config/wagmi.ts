"use client";

import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, sepolia } from "wagmi/chains";
import { arcTestnet, IS_TESTNET } from "./chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || "demo_arc_bridge_testnet";

export const wagmiConfig = getDefaultConfig({
  appName: process.env.NEXT_PUBLIC_APP_NAME || "Arc Bridge",
  projectId,
  chains: IS_TESTNET
    ? [sepolia, baseSepolia, arcTestnet]
    : [sepolia, arcTestnet],
  ssr: true,
});
