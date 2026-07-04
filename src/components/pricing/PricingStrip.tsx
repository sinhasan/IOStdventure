import { Crown, Package, Zap } from "lucide-react";

type PricingStripProps = {
  totalProfiles: number;
};

const SINGLE_CONNECT_FEE = 149;
const SECTOR_PACK_FEE = 11999;
const FULL_ACCESS_FEE = 59999;

export default function PricingStrip({ totalProfiles }: PricingStripProps) {
  const singleTotal = totalProfiles * SINGLE_CONNECT_FEE;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {/* Single Connect */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-800/50 bg-blue-50/60 dark:bg-blue-950/20 p-3.5">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-900/40 flex items-center justify-center shrink-0">
          <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300">Single Connect from 149 Onwards</p>
          <p className="text-lg font-bold text-blue-800 dark:text-blue-200 leading-tight">₹{SINGLE_CONNECT_FEE.toLocaleString()}</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-0.5">per profile, permanent</p>
        </div>
      </div>

      {/* Sector Pack */}
      <div className="flex items-start gap-3 rounded-xl border border-violet-200 dark:border-violet-800/50 bg-violet-50/60 dark:bg-violet-950/20 p-3.5">
        <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
          <Package className="w-4 h-4 text-violet-600 dark:text-violet-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-violet-700 dark:text-violet-300">Sector Pack</p>
          <p className="text-lg font-bold text-violet-800 dark:text-violet-200 leading-tight">₹{SECTOR_PACK_FEE.toLocaleString()}</p>
          <p className="text-xs text-violet-600/80 dark:text-violet-400/80 mt-0.5">all in one sector · 6 months</p>
        </div>
      </div>

      {/* Full Access */}
      <div className="flex items-start gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 p-3.5">
        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
          <Crown className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">Full Access</p>
          <p className="text-lg font-bold text-amber-800 dark:text-amber-200 leading-tight">₹{FULL_ACCESS_FEE.toLocaleString()}</p>
          <p className="text-xs text-amber-600/80 dark:text-amber-400/80 mt-0.5">
            all {totalProfiles} profiles · 6 months
            {totalProfiles > 0 && (
              <span className="ml-1 line-through opacity-60">₹{singleTotal.toLocaleString()}</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
