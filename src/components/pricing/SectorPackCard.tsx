import { useState, useMemo } from "react";
import { Package, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";

const ALL_SECTORS = ["FinTech", "HealthTech", "SaaS", "AI/ML", "CleanTech", "EdTech", "Consumer", "DeepTech"] as const;

type SectorPackCardProps = {
  activeSectors: string[];
  onBuy: (sector: string) => Promise<void>;
  paying: boolean;
};

export default function SectorPackCard({ activeSectors, onBuy, paying }: SectorPackCardProps) {
  const unpurchasedSectors = useMemo(
    () => (ALL_SECTORS as readonly string[]).filter((s) => !activeSectors.includes(s)),
    [activeSectors]
  );

  const [selectedSector, setSelectedSector] = useState<string>(() => unpurchasedSectors[0] ?? "");

  // If selected sector was just purchased, advance to next unpurchased
  const effectiveSelected = unpurchasedSectors.includes(selectedSector)
    ? selectedSector
    : (unpurchasedSectors[0] ?? "");

  const handleBuy = async () => {
    await onBuy(effectiveSelected);
  };

  return (
    <div className="rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/40 dark:bg-violet-950/10 p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
          <Package className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-violet-800 dark:text-violet-200">Sector Pack — ₹11,999</p>
          <p className="text-xs text-violet-600/80 dark:text-violet-400/80 mt-0.5">
            Unlock all profiles in any one sector for 6 months
          </p>

          {/* Active sector tags */}
          {activeSectors.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {activeSectors.map((s) => (
                <span key={s} className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/40 font-medium">
                  <CheckCircle2 className="w-3 h-3" /> {s}
                </span>
              ))}
            </div>
          )}

          {/* Dropdown + Buy button — only shown if there are unpurchased sectors */}
          {unpurchasedSectors.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3 items-center">
              <select
                value={effectiveSelected}
                onChange={(e) => setSelectedSector(e.target.value)}
                className="text-sm px-3 py-1.5 rounded-lg border border-violet-300 dark:border-violet-700 bg-white dark:bg-violet-950/30 text-violet-800 dark:text-violet-200 focus:outline-none focus:ring-2 focus:ring-violet-400/50 cursor-pointer transition-all"
              >
                {unpurchasedSectors.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>

              <Button
                size="sm"
                onClick={handleBuy}
                disabled={paying || !effectiveSelected}
                className="bg-violet-600 hover:bg-violet-700 text-white text-xs px-3 py-1.5 h-auto"
              >
                {paying ? "Processing..." : "Buy Sector Pack"}
              </Button>
            </div>
          )}

          {unpurchasedSectors.length === 0 && (
            <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-2 font-medium">
              All sectors unlocked via your sector packs.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
