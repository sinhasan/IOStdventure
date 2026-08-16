import React from "react";

export default function TerminalHeader() {
  const ticker = [
    "TDV MATCH NETWORK • LIVE INVESTOR INTELLIGENCE",
    "NIFTY 50 ▲ 25,186.20 (+0.48%)",
    "SENSEX ▲ 82,615.31 (+0.44%)",
    "NASDAQ ▲ +0.91%",
    "S&P 500 ▲ +0.63%",
    "USD/INR 83.72",
    "GOLD ₹9,875/g",
    "VC DEALS +18 TODAY",
  ];

  return (
    <div className="mb-2">
      <div className="overflow-hidden rounded-lg border border-[#D4FF00]/35 bg-black shadow-[0_0_24px_rgba(212,255,0,0.06)]">

        <div className="bg-[#D4FF00] px-4 py-2 text-sm font-black tracking-wide text-black">
          TDVENTURE TERMINAL
        </div>

        <div className="relative overflow-hidden border-t border-[#D4FF00]/20 py-2.5">
          {/* Duplicated list + translateX(-50%) = seamless infinite loop */}
          <div className="flex w-max animate-ticker-scroll gap-10 whitespace-nowrap px-4 font-mono text-xs text-zinc-300">
            {[...ticker, ...ticker].map((item, i) => (
              <span
                key={i}
                className={item.startsWith("TDV MATCH")
                  ? "font-bold text-[#D4FF00]"
                  : undefined}
              >
                {item}
              </span>
            ))}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes ticker-scroll {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-ticker-scroll {
          animation: ticker-scroll 34s linear infinite;
        }
        .animate-ticker-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
}
