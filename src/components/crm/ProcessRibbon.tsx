import { useLocation } from "react-router-dom";

const steps = ["Register", "Discover", "Connect", "Reveal", "Opportunities"];

function getCurrentStep(pathname: string) {
  if (pathname.includes("discover")) return "Discover";
  if (pathname.includes("payments")) return "Reveal";
  if (pathname.includes("matches") || pathname.includes("opportunities")) return "Opportunities";
  if (pathname.includes("startups") || pathname.includes("investors") || pathname.includes("profiles")) return "Register";
  return "Register";
}

export default function ProcessRibbon() {
  const location = useLocation();
  const current = getCurrentStep(location.pathname);

  return (
    <div className="relative z-10 border-b border-lime-500/70 bg-black/90 text-lime-400 px-4 py-3">
      <div className="flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-lime-400 opacity-80 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-lime-400 shadow-[0_0_18px_#a3ff12]"></span>
          </span>
          <span>TD Venture Deal Desk Live</span>
        </div>

        <div className="flex items-center gap-2 text-xs md:text-sm whitespace-nowrap">
          {steps.map((step, index) => (
            <div key={step} className="flex items-center gap-2">
              <span
                className={
                  step === current
                    ? "px-4 py-1 rounded-full bg-lime-400 text-black font-semibold shadow-[0_0_18px_rgba(163,255,18,0.45)]"
                    : "px-4 py-1 rounded-full border border-lime-500/50 text-lime-300"
                }
              >
                {step}
              </span>
              {index < steps.length - 1 && <span className="text-lime-700">→</span>}
            </div>
          ))}
        </div>

        <div className="text-xs text-lime-300 whitespace-nowrap">
          You are here: <span className="font-semibold text-lime-400">{current}</span>
        </div>
      </div>
    </div>
  );
}
