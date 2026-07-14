/**
 * Client-side bridge via Circle App Kit.
 * Wallet signs; customFee → 90% FEE_RECIPIENT / 10% Circle.
 */
import { AppKit } from "@circle-fin/app-kit";
import { createViemAdapterFromProvider } from "@circle-fin/adapter-viem-v2";
import {
  ARC_DEST,
  FEE_RECIPIENT,
  feeFromAmount,
  type CircleChainName,
} from "@/config/chains";

export type BridgeProgress = {
  step: string;
  state?: string;
  txHash?: string;
  explorerUrl?: string;
};

export type BridgeParams = {
  sourceCircleName: CircleChainName;
  amount: string;
  /** EIP-1193 from active wagmi connector (preferred) */
  provider?: unknown;
  /** default true for Arc zero-gas bootstrap */
  useForwarder?: boolean;
  /** CCTP speed */
  transferSpeed?: "FAST" | "SLOW";
  onProgress?: (p: BridgeProgress) => void;
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (...args: unknown[]) => void;
  removeListener?: (...args: unknown[]) => void;
};

export async function bridgeUsdcToArc(params: BridgeParams) {
  if (typeof window === "undefined") {
    throw new Error("Bridge only runs in the browser.");
  }

  const fromParam = params.provider as Eip1193Provider | undefined;
  const ethereum =
    fromParam?.request
      ? fromParam
      : (window as unknown as { ethereum?: Eip1193Provider }).ethereum;
  if (!ethereum?.request) {
    throw new Error("No browser wallet found. Connect MetaMask / Rabby first.");
  }

  // Circle adapter expects EIP-1193 provider
  const adapter = await createViemAdapterFromProvider({
    provider: ethereum as never,
  });

  const kit = new AppKit();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  kit.on("*" as any, (payload: any) => {
    const values = payload?.values || {};
    const data = values?.data || {};
    params.onProgress?.({
      step: String(values.name || payload?.method || payload?.type || "event"),
      state: values.state ? String(values.state) : undefined,
      txHash: values.txHash
        ? String(values.txHash)
        : data.txHash
          ? String(data.txHash)
          : undefined,
      explorerUrl: values.explorerUrl ? String(values.explorerUrl) : undefined,
    });
  });

  const feeValue = feeFromAmount(params.amount);
  const useForwarder = params.useForwarder !== false;

  const result = await kit.bridge({
    from: {
      adapter,
      chain: params.sourceCircleName,
    },
    to: {
      adapter,
      chain: ARC_DEST.circleName,
      useForwarder,
    },
    amount: params.amount,
    config: {
      transferSpeed: params.transferSpeed || "SLOW",
      ...(Number(feeValue) > 0
        ? {
            customFee: {
              value: feeValue,
              recipientAddress: FEE_RECIPIENT,
            },
          }
        : {}),
    },
  });

  if (result && (result as { state?: string }).state === "error") {
    const retried = await kit.retryBridge(result as never, {
      from: adapter,
      to: adapter,
    });
    return retried;
  }
  return result;
}
