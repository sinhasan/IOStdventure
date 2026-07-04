import { Crown } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { format } from "date-fns";

const FULL_ACCESS_FEE = 59999;
const SINGLE_CONNECT_FEE = 599;

type FullAccessBannerProps = {
  totalProfiles: number;
  onPay: () => void;
  paying: boolean;
  hasFullAccess: boolean;
  fullAccessExpiresAt: string | null;
  label: string;
};

export default function FullAccessBanner({
  totalProfiles,
  onPay,
  paying,
  hasFullAccess,
  fullAccessExpiresAt,
  label,
}: FullAccessBannerProps) {
  if (hasFullAccess) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-300 dark:border-amber-700/60 bg-amber-50 dark:bg-amber-950/20 px-4 py-3">
        <Crown className="w-5 h-5 text-amber-500 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">Full Access Active</p>
          {fullAccessExpiresAt && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
              Expires {format(new Date(fullAccessExpiresAt), "d MMM yyyy")}
            </p>
          )}
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-200 dark:bg-amber-800/50 text-amber-800 dark:text-amber-200">
          Active
        </span>
      </div>
    );
  }

  const worthAmount = totalProfiles * SINGLE_CONNECT_FEE;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/20 dark:to-yellow-950/10 px-4 py-3.5">
      <Crown className="w-5 h-5 text-amber-500 shrink-0 hidden sm:block" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
          Unlock every {label} instantly
        </p>
        <p className="text-xs text-amber-600/90 dark:text-amber-400/90 mt-0.5">
          Access all {totalProfiles} profiles for 6 months
          {totalProfiles > 0 && (
            <> — worth ₹{worthAmount.toLocaleString()} if bought individually</>
          )}
        </p>
      </div>
      <Button
        size="sm"
        onClick={onPay}
        disabled={paying}
        className="bg-amber-500 hover:bg-amber-600 text-white shrink-0 text-xs font-semibold px-4 whitespace-nowrap"
      >
        <Crown className="w-3.5 h-3.5 mr-1.5" />
        {paying ? "Processing..." : `Get Full Access — ₹${FULL_ACCESS_FEE.toLocaleString()}`}
      </Button>
    </div>
  );
}
