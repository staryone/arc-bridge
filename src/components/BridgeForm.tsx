"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useBalance, useSwitchChain } from "wagmi";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  APP_NAME,
  ARC_CHAIN,
  EVM_OPTIONS,
  FEE_RECIPIENT,
  IS_TESTNET,
  SPEED_TIERS,
  feeFromAmount,
  mainnetStatusMessage,
  youReceiveFromFee,
  type ChainOption,
  type SpeedId,
} from "@/config/chains";
import { bridgeUsdc, type BridgeProgress } from "@/lib/bridge";
import { formatUnits } from "viem";

const PRESETS = ["1", "5", "10", "25"];
const SPEEDS = Object.values(SPEED_TIERS);

function Chevron({ open }: { open?: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      className={`shrink-0 text-[#5b616e] transition-transform ${open ? "rotate-180" : ""}`}
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChainPill({ c, dim }: { c: ChainOption; dim?: boolean }) {
  return (
    <span className="flex items-center gap-2 min-w-0">
      <span
        className={`size-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
          c.isArc
            ? "bg-[#0a0b0d] text-white"
            : "bg-[#0052ff]/10 text-[#0052ff]"
        }`}
      >
        {c.short.slice(0, 3)}
      </span>
      <span className={`truncate text-[15px] font-semibold ${dim ? "text-white" : "text-[#0a0b0d]"}`}>
        {c.label}
      </span>
    </span>
  );
}

function RoundedSelect<T extends string>({
  label,
  value,
  options,
  onChange,
  renderOption,
  renderValue,
}: {
  label: string;
  value: T;
  options: { id: T; disabled?: boolean }[];
  onChange: (v: T) => void;
  renderOption: (id: T) => ReactNode;
  renderValue: (id: T) => ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="block relative" ref={ref}>
      <span className="text-[13px] font-semibold text-[#5b616e]">{label}</span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-1.5 w-full h-12 rounded-2xl border border-[#e8eaed] bg-[#f7f8fa] px-3.5 flex items-center justify-between gap-2 text-left outline-none hover:border-[#c9cdd4] focus:border-[#0052ff] focus:ring-2 focus:ring-[#0052ff]/15 transition-colors"
      >
        <span className="min-w-0 flex-1">{renderValue(value)}</span>
        <Chevron open={open} />
      </button>
      {open && (
        <div className="absolute z-30 left-0 right-0 mt-1.5 rounded-2xl border border-[#e8eaed] bg-white shadow-[0_12px_40px_rgba(10,11,13,0.12)] overflow-hidden py-1 max-h-64 overflow-y-auto">
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              disabled={o.disabled}
              onClick={() => {
                if (o.disabled) return;
                onChange(o.id);
                setOpen(false);
              }}
              className={`w-full px-3.5 py-2.5 flex items-center text-left transition-colors ${
                o.disabled
                  ? "opacity-40 cursor-not-allowed"
                  : o.id === value
                    ? "bg-[#0052ff]/08"
                    : "hover:bg-[#f7f8fa]"
              }`}
            >
              {renderOption(o.id)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function BridgeForm() {
  const { address, isConnected, chain, connector } = useAccount();
  const { switchChainAsync } = useSwitchChain();

  const [fromId, setFromId] = useState(EVM_OPTIONS[0]?.id || "eth-sepolia");
  const [toId, setToId] = useState(ARC_CHAIN.id);
  const [amount, setAmount] = useState("1");
  const [speedId, setSpeedId] = useState<SpeedId>("fast");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [logs, setLogs] = useState<BridgeProgress[]>([]);
  const busyGuard = useRef(false);

  const from = useMemo(() => {
    if (fromId === ARC_CHAIN.id) return ARC_CHAIN;
    return EVM_OPTIONS.find((s) => s.id === fromId) || EVM_OPTIONS[0];
  }, [fromId]);

  const to = useMemo(() => {
    if (toId === ARC_CHAIN.id) return ARC_CHAIN;
    return EVM_OPTIONS.find((s) => s.id === toId) || EVM_OPTIONS[0];
  }, [toId]);

  const speed = SPEED_TIERS[speedId];

  const allChains: ChainOption[] = useMemo(
    () => [...EVM_OPTIONS, ARC_CHAIN],
    []
  );

  const usdcBal = useBalance({
    address,
    token: from?.usdc ?? undefined,
    chainId: from?.chain.id,
    query: { enabled: Boolean(address && from) },
  });

  const fee = feeFromAmount(amount, speed.feeBps);
  const youNet = youReceiveFromFee(fee);
  const totalDebit = useMemo(() => {
    const a = Number(amount) || 0;
    const f = Number(fee) || 0;
    return (a + f).toFixed(6).replace(/\.?0+$/, "");
  }, [amount, fee]);

  const balLabel = usdcBal.data
    ? Number(
        formatUnits(usdcBal.data.value, usdcBal.data.decimals)
      ).toLocaleString(undefined, { maximumFractionDigits: 4 })
    : "—";

  function swapDirection() {
    setFromId(toId);
    setToId(fromId);
    setError(null);
    setResult(null);
  }

  function setFromSafe(id: string) {
    if (id === toId) {
      // auto flip destination to a valid pair
      if (id === ARC_CHAIN.id) {
        setToId(EVM_OPTIONS[0]?.id || "eth-sepolia");
      } else {
        setToId(ARC_CHAIN.id);
      }
    }
    setFromId(id);
  }

  function setToSafe(id: string) {
    if (id === fromId) {
      if (id === ARC_CHAIN.id) {
        setFromId(EVM_OPTIONS[0]?.id || "eth-sepolia");
      } else {
        setFromId(ARC_CHAIN.id);
      }
    }
    setToId(id);
  }

  async function onBridge() {
    if (busyGuard.current) return;
    setError(null);
    setResult(null);
    setLogs([]);
    if (!isConnected || !from || !to) {
      setError("Connect wallet first.");
      return;
    }
    if (from.id === to.id) {
      setError("From and To must be different chains.");
      return;
    }
    // Product rule: one leg must be Arc (this product is Arc-centric)
    if (!from.isArc && !to.isArc) {
      setError("One side must be Arc (bridge to/from Arc).");
      return;
    }
    const n = Number(amount);
    if (!Number.isFinite(n) || n <= 0) {
      setError("Enter a valid amount.");
      return;
    }

    busyGuard.current = true;
    setBusy(true);
    try {
      if (chain?.id !== from.chain.id && switchChainAsync) {
        await switchChainAsync({ chainId: from.chain.id });
      }
      let provider: unknown;
      try {
        provider = await connector?.getProvider?.();
      } catch {
        provider = undefined;
      }

      const res = await bridgeUsdc({
        fromCircleName: from.circleName,
        toCircleName: to.circleName,
        amount: String(amount),
        provider,
        // Always forward when minting on Arc — hidden from user
        useForwarder: Boolean(to.isArc),
        speed,
        onProgress: (p) => {
          setLogs((prev) => [...prev.slice(-50), p]);
          // Unlock early on terminal events so UI never sticks
          const blob = `${p.state || ""} ${p.step || ""}`.toLowerCase();
          if (
            blob.includes("success") ||
            blob.includes("complete") ||
            blob.includes("minted")
          ) {
            setBusy(false);
            busyGuard.current = false;
          }
        },
      });

      const state = (res as { state?: string })?.state || "done";
      const soft = (res as { soft?: boolean })?.soft;
      if (state === "error" && !soft) {
        setError("Bridge reported error — check logs / explorer.");
      } else {
        setResult(
          soft
            ? `Bridge likely succeeded (${state}). Confirm balance on ${to.label}.`
            : `Bridge finished: ${state}`
        );
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg);
    } finally {
      // Always clear — was stuck before when promise never settled cleanly
      setBusy(false);
      busyGuard.current = false;
    }
  }

  const cta = !isConnected
    ? "Connect wallet to bridge"
    : busy
      ? "Bridging…"
      : from?.isArc
        ? `Bridge to ${to?.label}`
        : `Bridge to ${to?.label}`;

  return (
    <div className="w-full max-w-[440px]">
      <div className="rounded-3xl border border-[#e8eaed] bg-white shadow-[0_8px_30px_rgba(10,11,13,0.06)] overflow-hidden">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-[0.08em] uppercase text-[#5b616e]">
              {IS_TESTNET ? "Testnet" : "Mainnet"} · CCTP v2
            </p>
            <h1 className="mt-1 text-[22px] font-semibold text-[#0a0b0d] tracking-tight">
              Bridge USDC
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
            Test tokens only. Arc gas is{" "}
            <span className="font-semibold text-[#0a0b0d]">USDC</span> — mint on
            Arc always uses Circle Forwarder (automatic).
          </div>
        )}

        {!IS_TESTNET && mainnetStatusMessage() && (
          <div className="mx-6 mb-4 rounded-2xl border border-[#f5d0a9] bg-[#fff7ed] px-4 py-3 text-[13px] text-[#9a3412] leading-snug">
            Soft-live only. {mainnetStatusMessage()}
          </div>
        )}

        <div className="px-6 space-y-4 pb-2">
          <RoundedSelect
            label="From"
            value={fromId}
            options={allChains.map((c) => ({
              id: c.id,
              disabled: c.id === toId,
            }))}
            onChange={setFromSafe}
            renderValue={(id) => {
              const c = allChains.find((x) => x.id === id)!;
              return <ChainPill c={c} />;
            }}
            renderOption={(id) => {
              const c = allChains.find((x) => x.id === id)!;
              return <ChainPill c={c} />;
            }}
          />

          {/* Swap direction */}
          <div className="flex justify-center -my-1">
            <button
              type="button"
              onClick={swapDirection}
              className="size-10 rounded-full border border-[#e8eaed] bg-white shadow-sm flex items-center justify-center hover:border-[#0052ff] hover:text-[#0052ff] transition-colors"
              title="Swap direction"
              aria-label="Swap from and to"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M6 3v12M6 15l-2.5-2.5M6 15l2.5-2.5M12 15V3M12 3l-2.5 2.5M12 3l2.5 2.5"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <RoundedSelect
            label="To"
            value={toId}
            options={allChains.map((c) => ({
              id: c.id,
              disabled: c.id === fromId,
            }))}
            onChange={setToSafe}
            renderValue={(id) => {
              const c = allChains.find((x) => x.id === id)!;
              if (c.isArc) {
                return (
                  <span className="flex items-center justify-between w-full pr-1">
                    <ChainPill c={c} />
                    <span className="text-[11px] font-medium text-[#5b616e]">
                      USDC gas · auto-forward
                    </span>
                  </span>
                );
              }
              return <ChainPill c={c} />;
            }}
            renderOption={(id) => {
              const c = allChains.find((x) => x.id === id)!;
              return <ChainPill c={c} />;
            }}
          />

          {/* Amount */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold text-[#5b616e]">
                Amount
              </span>
              <span className="text-[12px] text-[#5b616e]">
                Balance:{" "}
                <span className="font-semibold text-[#0a0b0d]">{balLabel}</span>{" "}
                USDC
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
                    const v = formatUnits(
                      usdcBal.data!.value,
                      usdcBal.data!.decimals
                    );
                    const feeNow = feeFromAmount(v, speed.feeBps);
                    const n = Math.max(
                      0,
                      Number(v) - Number(feeNow) - 0.01
                    );
                    setAmount(n > 0 ? n.toFixed(4) : "0");
                  }}
                  className="h-8 px-3 rounded-full bg-[#eef0f3] text-[12px] font-semibold text-[#0052ff] hover:bg-[#dce0e6] transition-colors"
                >
                  MAX
                </button>
              )}
            </div>
          </div>

          {/* Speed — 3 pills */}
          <div>
            <span className="text-[13px] font-semibold text-[#5b616e]">
              Speed
            </span>
            <div className="mt-1.5 grid grid-cols-3 gap-2">
              {SPEEDS.map((s) => {
                const active = speedId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSpeedId(s.id)}
                    className={`rounded-2xl border px-2 py-2.5 text-center transition-all ${
                      active
                        ? "border-[#0052ff] bg-[#0052ff]/08 ring-2 ring-[#0052ff]/15"
                        : "border-[#e8eaed] bg-[#f7f8fa] hover:border-[#c9cdd4]"
                    }`}
                  >
                    <p
                      className={`text-[13px] font-bold ${
                        active ? "text-[#0052ff]" : "text-[#0a0b0d]"
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="text-[10px] text-[#5b616e] mt-0.5">{s.eta}</p>
                    <p className="text-[11px] font-semibold text-[#0a0b0d] mt-1">
                      {s.feeBps} bps
                    </p>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[11px] text-[#5b616e] leading-snug">
              {speed.blurb}
              {speed.honestNote ? (
                <span className="block mt-1 text-[#8a919e]">
                  {speed.honestNote}
                </span>
              ) : null}
            </p>
          </div>

          {/* Fee breakdown */}
          <div className="rounded-2xl bg-[#f7f8fa] border border-[#e8eaed] px-4 py-3 space-y-1.5 text-[13px]">
            <div className="flex justify-between text-[#5b616e]">
              <span>Transfer</span>
              <span className="font-semibold text-[#0a0b0d]">
                {amount || "0"} USDC
              </span>
            </div>
            <div className="flex justify-between text-[#5b616e]">
              <span>
                Service fee ({speed.feeBps} bps · {speed.label})
              </span>
              <span className="font-semibold text-[#0a0b0d]">+{fee} USDC</span>
            </div>
            <div className="flex justify-between text-[#5b616e]">
              <span>Operator net (~90%)</span>
              <span className="font-semibold text-[#0a0b0d]">~{youNet} USDC</span>
            </div>
            <div className="flex justify-between text-[#5b616e] border-t border-[#e8eaed] pt-1.5">
              <span>You sign (source)</span>
              <span className="font-bold text-[#0a0b0d]">≈ {totalDebit} USDC</span>
            </div>
            <p className="text-[11px] text-[#5b616e] leading-snug pt-1">
              Fee on top of amount. 90% operator · 10% Circle. FAST also has CCTP
              protocol fee (~1–14 bps) taken from transfer amount. Arc destination
              always uses Forwarder (hidden).
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
            {cta}
          </button>

          {busy && (
            <button
              type="button"
              className="mt-2 w-full text-[12px] text-[#5b616e] hover:text-[#0052ff]"
              onClick={() => {
                setBusy(false);
                busyGuard.current = false;
                setResult(
                  "UI unlocked. If you already signed, check explorer — transfer may still complete."
                );
              }}
            >
              Unlock button (if stuck)
            </button>
          )}

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
