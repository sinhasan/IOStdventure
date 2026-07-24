import { Link } from "react-router-dom";

const marketplaceUrl = "https://staging.tdventure.vc";

const marketplaceSteps = [
  "Register",
  "Discover",
  "Connect",
  "Reveal",
];

export default function ProcessRibbon() {
  return (
    <div className="relative z-10 border-b border-lime-500/70 bg-black/90 px-4 py-3 text-lime-400">
      <div className="flex items-center justify-between gap-4 overflow-x-auto">
        <div className="flex items-center gap-3 text-xs uppercase tracking-widest">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-lime-400 opacity-80"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-lime-400 shadow-[0_0_18px_#a3ff12]"></span>
          </span>
          <span>TD Venture Deal Desk Live</span>
        </div>

        <div className="flex items-center gap-2 whitespace-nowrap text-xs md:text-sm">
          {marketplaceSteps.map((step) => (
            <div key={step} className="flex items-center gap-2">
              <a
                href={marketplaceUrl}
                target="_blank"
                rel="noreferrer"
                title={`Continue ${step} in Private Marketplace`}
                className="inline-flex min-w-[104px] items-center justify-center rounded-full bg-lime-400 px-4 py-1.5 text-center font-bold text-black shadow-[0_0_22px_rgba(163,255,18,0.75)] transition hover:bg-lime-300"
              >
                {step}
              </a>

              <span className="font-bold text-lime-400">→</span>
            </div>
          ))}

          <Link
            to="/matches"
            className="inline-flex min-w-[120px] items-center justify-center rounded-full border border-lime-300 bg-black px-4 py-1.5 text-center font-bold text-lime-300 shadow-[0_0_18px_rgba(163,255,18,0.4)]"
          >
            Opportunities
          </Link>
        </div>

        <div className="whitespace-nowrap text-xs text-lime-300">
          You are here:{" "}
          <span className="font-semibold text-lime-400">
            Deal Desk
          </span>
        </div>
      </div>
    </div>
  );
}
