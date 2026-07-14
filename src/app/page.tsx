import { BridgeForm } from "@/components/BridgeForm";
import { APP_NAME, IS_TESTNET } from "@/config/chains";

export default function Home() {
  return (
    <div className="bg-mesh min-h-screen">
      {/* Top bar — Circle faucet inspired */}
      <header className="border-b border-[#e8eaed]/80 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-full bg-[#0052ff] flex items-center justify-center shadow-[0_2px_8px_rgba(0,82,255,0.35)]">
              <span className="text-white text-[13px] font-bold">A</span>
            </div>
            <div className="leading-tight">
              <p className="text-[15px] font-semibold text-[#0a0b0d]">{APP_NAME}</p>
              <p className="text-[11px] text-[#5b616e] -mt-0.5">
                {IS_TESTNET ? "Arc Testnet · CCTP" : "Arc · CCTP"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-[12px] font-medium text-[#5b616e]">
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#0052ff] hidden sm:inline"
            >
              Get test USDC
            </a>
            <a
              href="https://docs.arc.network/"
              target="_blank"
              rel="noreferrer"
              className="hover:text-[#0052ff] hidden sm:inline"
            >
              Arc docs
            </a>
            {IS_TESTNET && (
              <span className="rounded-full bg-[#0052ff]/10 text-[#0052ff] px-2.5 py-1 text-[11px] font-bold tracking-wide">
                TESTNET
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:py-16 flex flex-col items-center">
        <div className="text-center mb-8 max-w-lg">
          <h2 className="text-[32px] sm:text-[40px] font-semibold tracking-tight text-[#0a0b0d] leading-[1.1]">
            Move USDC to Arc
            <span className="text-[#0052ff]">.</span>
          </h2>
          <p className="mt-3 text-[15px] text-[#5b616e] leading-relaxed">
            Non-custodial bridge powered by Circle CCTP. Connect your wallet, pick a
            source chain, and land USDC on Arc — gas is USDC-native.
          </p>
        </div>

        <BridgeForm />

        {/* Feature row — Astryx-clean density */}
        <div className="mt-12 grid sm:grid-cols-3 gap-4 w-full max-w-3xl">
          {[
            {
              t: "Non-custodial",
              d: "You sign. Keys never leave your wallet. No server hot key.",
            },
            {
              t: "Circle CCTP v2",
              d: "Burn on source, mint on Arc. Official App Kit + forwarder bootstrap.",
            },
            {
              t: "Transparent fee",
              d: "Service fee shown before sign. 90% operator · 10% Circle split on-chain.",
            },
          ].map((f) => (
            <div
              key={f.t}
              className="rounded-2xl border border-[#e8eaed] bg-white/70 px-4 py-4"
            >
              <p className="text-[14px] font-semibold text-[#0a0b0d]">{f.t}</p>
              <p className="mt-1 text-[12px] text-[#5b616e] leading-snug">{f.d}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="border-t border-[#e8eaed] py-6 text-center text-[12px] text-[#8a919e]">
        Built for operators · not affiliated with Circle or Arc · open source soon
      </footer>
    </div>
  );
}
