"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
import { useMemo, useState } from "react";
import {
  APP_NAME,
  ARC_DEST,
  FEE_BPS,
  FEE_RECIPIENT,
  IS_TESTNET,
  SOURCE_OPTIONS,
  feeFromAmount,
  youReceiveFromFee,
} from "@/config/chains";
import { bridgeUsdcToArc, type BridgeProgress } from "@/lib/bridge";
import { formatUnits } from "viem";

const PRESETS = ["1", "5", "10", "25"];

export function BridgeForm() {
  const { address, isConnected, chain, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();
  const [sourceId, setSourceId] = useState(SOURCE_OPTIONS[0]?.id || "eth-sepolia");
  const [amount, setAmount] = useState("1");
  const [useForwarder, setUseForwarder] = useState(true);
  const [speed, setSpeed] = useState<"SLOW" | "FAST">("SLOW");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<BridgeProgress[]>([]);

  const source = useMemo(
    () => SOURCE_OPTIONS.find((s) => s.id === sourceId) || SOURCE_OPTIONS[0],
    [sourceId]
  );

  const usdcBal = useBalance({
    address,
    token: source?.usdc,
    chainId: source?.chain.id,
    query: { enabled: Boolean(address && source) },
  });

  const fee = feeFromAmount(amount);
  const youGet = youReceiveFromFee(fee);
  const totalDebit = useMemo(() => {
    const a = Number(amount) || 0;
    const f = Number(fee) || 0;
    return (a + f).toFixed(6).replace(/\.?0+$/, "");
  }, [amount, fee]);

  const balLabel = usdcBal.data
    ? Number(formatUnits(usdcBal.data.value, usdcBal.data.decimals)).toLocaleString(
        undefined,
        { maximumFractionDigits: 4 }
      )
    : "—";

  async function onBridge() {
    setError(null);
    setResult(null);
    setLogs([]);
    if (!isConnected || !source) {
      setError("Connect wallet first.");
      return;
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid amount.");
      return;
    }
    try {
      setBusy(true);
      if (chain?.id !== source.chain.id && switchChainAsync) {
        await switchChainAsync({ chainId: source.chain.id });
      }
      let provider: unknown;
      try {
        provider = await connector?.getProvider?.();
      } catch {
        provider = undefined;
      }
      const res = await bridgeUsdcToArc({
        sourceCircleName: source.circleName,
        amount: String(amount),
        provider,
        useForwarder,
        transferSpeed: speed,
        onProgress: (p) => setLogs((prev) => [...prev.slice(-40), p]),
      });
      const state = (res as { state?: string })?.state || "done";
      setResult(`Bridge finished: ${state}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="w-full max-w-[440px]">
      {/* Card — Circle faucet style */}
      <div className="rounded-3xl border border-[#e8eaed] bg-white shadow-[0_8px_30px_rgba(10,11,13,0.06)] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#5b616e]">
              {IS_TESTNET ? "Testnet" : "Mainnet"} · CCTP v2
            </p>
            <h1 className="mt-1 text-[22px] font-semibold text-[#0a0b0d] tracking-tight">
              Bridge USDC to Arc
            </h1>
          </div>
          <ConnectButton
            chainStatus="icon"
            accountStatus="avatar"
            showBalance={false}
          />
        </div>

        {IS_TESTNET && (
          <div className="mx-6 mb-4 rounded-2xl bg-[#eef0f3] px-4 py-3 text-[13px] text-[#5b616e] leading-snug">
            Test tokens only. Gas on Arc is <span className="font-semibold text-[#0a0b0d]">USDC</span>.
            Keep <span className="font-semibold text-[#0a0b0d]">Forwarder</span> on for first deposit.
          </div>
        )}

        <div className="px-6 space-y-4 pb-2">
          {/* From */}
          <label className="block">
            <span className="text-[13px] font-semibold text-[#5b616e]">From</span>
            <select
              className="mt-1.5 w-full h-12 rounded-2xl border border-[#e8eaed] bg-[#f7f8fa] px-4 text-[15px] font-medium text-[#0a0b0d] outline-none focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/15"
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
            >
              {SOURCE_OPTIONS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          {/* To (locked Arc) */}
          <label className="block">
            <span className="text-[13px] font-semibold text-[#5b616e]">To</span>
            <div className="mt-1.5 w-full h-12 rounded-2xl border border-[#e8eaed] bg-[#0a0b0d] px-4 flex items-center justify-between text-white">
              <span className="text-[15px] font-semibold">{ARC_DEST.label}</span>
              <span className="text-[12px] text-white/60">USDC gas</span>
            </div>
          </label>

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#5b616e]">Amount</span>
              <span className="text-[12px] text-[#5b616e]">
                Balance: <span className="font-semibold text-[#0a0b0d]">{balLabel}</span> USDC
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 rounded-2xl border border-[#e8eaed] bg-[#f7f8fa] px-4 h-14 focus-within:border-[#0052ff] focus-within:ring-2 focus-within:ring-[#0052ff]/15">
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                className="flex-1 bg-transparent text-[20px] font-semibold text-[#0a0b0d] outline-none"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
              />
              <span className="text-[14px] font-bold text-[#0052ff]">USDC</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setAmount(p)}
                  className="h-8 px-3 rounded-full bg-[#eef0f3] text-[12px] font-semibold text-[#0a0b0d] hover:bg-[#dce0e6] transition-colors"
                >
                  {p}
                </button>
              ))}
              {usdcBal.data && (
                <button
                  type="button"
                  onClick={() => {
                    const v = formatUnits(usdcBal.data!.value, usdcBal.data!.decimals);
                    // leave a tiny buffer for fee on top
                    const n = Math.max(0, Number(v) - Number(feeFromAmount(v)) - 0.01);
                    setAmount(n > 0 ? n.toFixed(4) : "0");
                  }}
                  className="h-8 px-3 rounded-full bg-[#eef0f3] text-[12px] font-semibold text-[#0052ff] hover:bg-[#dce0e6] transition-colors"
                >
                  MAX
                </button>
              )}
            </div>
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex items-center gap-2 rounded-2xl border border-[#e8eaed] px-3 py-3 cursor-pointer hover:border-[#0052ff]/40">
              <input
                type="checkbox"
                checked={useForwarder}
                onChange={(e) => setUseForwarder(e.target.checked)}
                className="size-4 accent-[#0052ff]"
              />
              <span className="text-[13px] font-medium text-[#0a0b0d]">
                Forwarder
                <span className="block text-[11px] text-[#5b616e] font-normal">
                  needed if Arc bal = 0
                </span>
              </span>
            </label>
            <label className="block rounded-2xl border border-[#e8eaed] px-3 py-2">
              <span className="text-[11px] font-semibold text-[#5b616e]">Speed</span>
              <select
                className="mt-0.5 w-full bg-transparent text-[13px] font-semibold text-[#0a0b0d] outline-none"
                value={speed}
                onChange={(e) => setSpeed(e.target.value as "SLOW" | "FAST")}
              >
                <option value="SLOW">Standard</option>
                <option value="FAST">Fast</option>
              </select>
            </label>
          </div>

          {/* Fee breakdown */}
          <div className="rounded-2xl bg-[#f7f8fa] border border-[#e8eaed] px-4 py-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between text-[#5b616e]">
              <span>Transfer</span>
              <span className="font-semibold text-[#0a0b0d]">{amount || "0"} USDC</span>
            </div>
            <div className="flex justify-between text-[#5b616e]">
              <span>Service fee ({FEE_BPS} bps)</span>
              <span className="font-semibold text-[#0a0b0d]">+{fee} USDC</span>
            </div>
            <div className="flex justify-between text-[#5b616e] border-t border-[#e8eaed] pt-1.5">
              <span>You sign (source)</span>
              <span className="font-bold text-[#0a0b0d]">≈ {totalDebit} USDC</span>
            </div>
            <p className="text-[11px] text-[#5b616e] leading-snug pt-1">
              Fee is charged on top of amount. 90% → operator · 10% → Circle. CCTP protocol fee
              (if FAST) and forwarder fee may reduce destination slightly.
            </p>
            <p className="text-[10px] font-mono text-[#8a919e] truncate">
              fee → {FEE_RECIPIENT}
            </p>
          </div>
        </div>

        <div className="p-6 pt-4">
          <button
            type="button"
            disabled={busy || !isConnected}
            onClick={onBridge}
            className="w-full h-14 rounded-full bg-[#0052ff] text-white text-[16px] font-semibold hover:bg-[#0041cc] disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-[0_4px_14px_rgba(0,82,255,0.35)]"
          >
            {busy
              ? "Bridging…"
              : !isConnected
                ? "Connect wallet to bridge"
                : `Bridge to ${ARC_DEST.label}`}
          </button>

          {error && (
            <div className="mt-3 rounded-2xl bg-[#fff1f0] border border-[#ffccc7] px-4 py-3 text-[13px] text-[#a8071a] whitespace-pre-wrap break-words">
              {error}
            </div>
          )}
          {result && (
            <div className="mt-3 rounded-2xl bg-[#f6ffed] border border-[#b7eb8f] px-4 py-3 text-[13px] text-[#135200]">
              {result}
            </div>
          )}

          {logs.length > 0 && (
            <div className="mt-3 max-h-40 overflow-auto rounded-2xl border border-[#e8eaed] bg-[#fafbfc] px-3 py-2 font-mono text-[11px] text-[#5b616e] space-y-1">
              {logs.map((l, i) => (
                <div key={i}>
                  <span className="text-[#0052ff]">{l.step}</span>
                  {l.state ? ` · ${l.state}` : ""}
                  {l.txHash ? ` · ${l.txHash.slice(0, 10)}…` : ""}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <p className="mt-4 text-center text-[12px] text-[#8a919e]">
        {APP_NAME} · non-custodial · powered by Circle CCTP
      </p>
    </div>
  );
}
