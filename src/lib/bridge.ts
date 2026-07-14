/**
 * Client-side bridge via Circle App Kit.
 * Wallet signs; customFee → 90% FEE_RECIPIENT / 10% Circle.
 * Always useForwarder when destination is Arc (zero-gas bootstrap).
 */
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import {
  FEE_RECIPIENT,
  feeFromAmount,
  type CircleChainName,
  type SpeedTier,
} from "@/config/chains";

export type BridgeProgress = {
  step: string;
  state?: string;
  txHash?: string;
  explorerUrl?: string;
  method?: string;
};

export type BridgeParams = {
  fromCircleName: CircleChainName;
  toCircleName: CircleChainName;
  amount: string;
  /** EIP-1193 from active wagmi connector (preferred) */
  provider?: unknown;
  /**
   * Force forwarder when minting on Arc (default true if to is Arc_*).
   * Hidden from UI — always on for Arc dest.
   */
  useForwarder?: boolean;
  speed: SpeedTier;
  onProgress?: (p: BridgeProgress) => void;
  /** Abort / early settle if kit hangs after success */
  signal?: AbortSignal;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (...args: unknown[]) => void;
  removeListener?: (...args: unknown[]) => void;
};

function isArcChain(name: string) {
  return name === "Arc_Testnet" || name === "Arc";
}

/**
 * Guard: App Kit only knows Arc_Testnet today. Calling kit.bridge with
 * placeholder "Arc" will fail until Circle ships mainnet chain config.
 */
function assertAppKitChainSupported(name: string) {
  if (name === "Arc") {
    throw new Error(
      "Arc mainnet is not in Circle App Kit yet (only Arc_Testnet). " +
        "Blockdaemon RPC is live (chainId 5042) but kit.bridge cannot target it. " +
        "See docs/MAINNET-FLIP.md and src/config/mainnet.ts readiness."
    );
  }
}

/** States that mean the user-facing flow is done enough to unlock UI */
function isTerminalProgress(p: BridgeProgress): boolean {
  const s = `${p.state || ""} ${p.step || ""} ${p.method || ""}`.toLowerCase();
  return (
    s.includes("success") ||
    s.includes("complete") ||
    s.includes("completed") ||
    s.includes("minted") ||
    s.includes("done") ||
    (s.includes("mint") && s.includes("success"))
  );
}

export async function bridgeUsdc(params: BridgeParams) {
  if (typeof window === "undefined") {
    throw new Error("Bridge only runs in the browser.");
  }

  const fromParam = params.provider as Eip1193Provider | undefined;
  const ethereum = fromParam?.request
    ? fromParam
    : (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum?.request) {
    throw new Error("No browser wallet found. Connect MetaMask / Rabby first.");
  }

  const adapter = await createViemAdapterFromProvider({
    provider: ethereum as never,
  });

  const kit = new AppKit();
  let sawTerminal = false;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kit.on("*" as any, (payload: any) => {
    const values = payload?.values || {};
    const data = values?.data || {};
    const progress: BridgeProgress = {
      step: String(values.name || payload?.method || payload?.type || "event"),
      state: values.state ? String(values.state) : undefined,
      method: payload?.method ? String(payload.method) : undefined,
      txHash: values.txHash
        ? String(values.txHash)
        : data.txHash
          ? String(data.txHash)
          : undefined,
      explorerUrl: values.explorerUrl ? String(values.explorerUrl) : undefined,
    };
    params.onProgress?.(progress);
    if (isTerminalProgress(progress)) sawTerminal = true;
  });

  assertAppKitChainSupported(params.fromCircleName);
  assertAppKitChainSupported(params.toCircleName);

  const feeBps = params.speed.feeBps;
  const feeValue = feeFromAmount(params.amount, feeBps);
  const toIsArc = isArcChain(params.toCircleName);
  const useForwarder =
    params.useForwarder !== undefined ? params.useForwarder : toIsArc;

  const config: Record<string, unknown> = {
    transferSpeed: params.speed.transferSpeed,
  };
  if (Number(feeValue) > 0) {
    config.customFee = {
      value: feeValue,
      recipientAddress: FEE_RECIPIENT,
    };
  }
  // Extreme / optional higher maxFee headroom (USDC human units as string)
  if (params.speed.maxFee) {
    config.maxFee = params.speed.maxFee;
  }

  // Cast: our CircleChainName is a subset of App Kit BridgeChainIdentifier strings
  const fromChain = params.fromCircleName as never;
  const toChain = params.toCircleName as never;

  const bridgePromise = kit.bridge({
    from: {
      adapter,
      chain: fromChain,
    },
    to: {
      adapter,
      chain: toChain,
      ...(useForwarder ? { useForwarder: true } : {}),
    },
    amount: params.amount,
    config: config as never,
  });

  // Hard timeout so UI never sticks forever (15 min)
  const timeoutMs = 15 * 60 * 1000;
  const timeoutPromise = new Promise<never>((_, reject) => {
    const t = setTimeout(
      () =>
        reject(
          new Error(
            "Bridge timed out waiting for final confirmation. Check explorer — transfer may still complete."
          )
        ),
      timeoutMs
    );
    params.signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new Error("Bridge cancelled"));
    });
  });

  let result: unknown;
  try {
    result = await Promise.race([bridgePromise, timeoutPromise]);
  } catch (e) {
    // If we already saw mint success events, treat as soft success
    if (sawTerminal) {
      return { state: "success", soft: true, error: String(e) };
    }
    throw e;
  }

  if (result && (result as { state?: string }).state === "error") {
    try {
      const retried = await kit.retryBridge(result as never, {
        from: adapter,
        to: adapter,
      });
      return retried;
    } catch (re) {
      if (sawTerminal) return { state: "success", soft: true };
      throw re;
    }
  }
  return result;
}

/** @deprecated */
export async function bridgeUsdcToArc(
  params: Omit<BridgeParams, "fromCircleName" | "toCircleName" | "speed"> & {
    sourceCircleName: CircleChainName;
    transferSpeed?: "FAST" | "SLOW";
    useForwarder?: boolean;
  }
) {
  const { SPEED_TIERS } = await import("@/config/chains");
  const speed =
    params.transferSpeed === "FAST" ? SPEED_TIERS.fast : SPEED_TIERS.standard;
  return bridgeUsdc({
    fromCircleName: params.sourceCircleName,
    toCircleName: "Arc_Testnet",
    amount: params.amount,
    provider: params.provider,
    useForwarder: params.useForwarder,
    speed,
    onProgress: params.onProgress,
  });
}
