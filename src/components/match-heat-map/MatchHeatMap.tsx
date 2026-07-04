import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { MATCH_PALETTE } from "@/lib/match-palette.ts";

export type MatchCounts = {
  high:   number; // score >= 70
  medium: number; // score >= 40 && < 70
  low:    number; // score < 40
};

/** Derive MatchCounts from an array of profiles that have a matchScore field */
export function countMatches(profiles: { matchScore: number; isIncomplete?: boolean }[]): MatchCounts {
  let high = 0, medium = 0, low = 0;
  for (const p of profiles) {
    if (p.isIncomplete) continue;
    if (p.matchScore >= 70) high++;
    else if (p.matchScore >= 40) medium++;
    else low++;
  }
  return { high, medium, low };
}

const SLICES = [
  {
    key:      "high"   as const,
    label:    "Strong matches",
    sublabel: "70%+ score",
    color:    MATCH_PALETTE.high.hex,
  },
  {
    key:      "medium" as const,
    label:    "Good matches",
    sublabel: "40–69% score",
    color:    MATCH_PALETTE.medium.hex,
  },
  {
    key:      "low"    as const,
    label:    "Low matches",
    sublabel: "< 40% score",
    color:    MATCH_PALETTE.low.hex,
  },
];

type TooltipPayloadEntry = {
  name: string;
  value: number;
  payload: { color: string };
};

function CustomTooltip({ active, payload, total }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  total: number;
}) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const pct = total > 0 ? Math.round((entry.value / total) * 100) : 0;
  return (
    <div
      className="rounded-xl border border-border/50 bg-background shadow-xl px-4 py-3 text-xs z-50"
      style={{ minWidth: 160 }}
    >
      <div className="flex items-center gap-2 font-bold text-sm mb-1" style={{ color: entry.payload.color }}>
        <span
          className="inline-block w-3 h-3 rounded-full shrink-0"
          style={{ background: entry.payload.color }}
        />
        {entry.name}
      </div>
      <div className="text-muted-foreground space-y-0.5">
        <div><span className="font-bold text-foreground">{entry.value}</span> match{entry.value !== 1 ? "es" : ""}</div>
        <div><span className="font-bold text-foreground">{pct}%</span> of total</div>
      </div>
    </div>
  );
}

function dominantLabel(counts: MatchCounts, total: number): string | null {
  if (total === 0) return null;
  const max = Math.max(counts.high, counts.medium, counts.low);
  if (counts.high === max && counts.high > 0) return "Most of your matches are strong (70%+) ✦";
  if (counts.medium === max && counts.medium > 0) return "Most of your matches are good (40–69%)";
  if (counts.low > 0) return "Complete your profile to improve match scores";
  return null;
}

interface MatchHeatMapProps {
  counts: MatchCounts;
  className?: string;
}

export default function MatchHeatMap({ counts, className = "" }: MatchHeatMapProps) {
  const total = counts.high + counts.medium + counts.low;
  const dominant = dominantLabel(counts, total);

  const pieData = SLICES.map((s) => ({
    name:  s.label,
    value: counts[s.key] === 0 ? 0.001 : counts[s.key],
    realValue: counts[s.key],
    color: s.color,
  }));

  return (
    <div
      className={`rounded-2xl border border-border/40 bg-white dark:bg-zinc-900 shadow-lg overflow-hidden ${className}`}
      style={{ boxShadow: "0 4px 24px 0 rgba(0,0,0,0.10)" }}
    >
      {/* Coloured top accent bar */}
      <div
        className="h-1 w-full"
        style={{
          background: `linear-gradient(to right, ${MATCH_PALETTE.high.hex}, ${MATCH_PALETTE.medium.hex}, ${MATCH_PALETTE.low.hex})`,
        }}
      />

      <div className="p-5 flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold tracking-tight text-foreground">Match Heat Map</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Distribution of your match scores</p>
          </div>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
            style={{
              background: "rgba(0,166,90,0.10)",
              color: MATCH_PALETTE.high.text,
              border: `1px solid ${MATCH_PALETTE.high.border}`,
            }}
          >
            {total} total
          </span>
        </div>

        {total === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-3xl">📊</div>
            <p className="text-sm font-semibold text-foreground">No matches yet</p>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Complete your profile to start seeing match scores here
            </p>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-5">
            {/* Pie chart */}
            <div className="w-[148px] h-[148px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={68}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#fff"
                    strokeWidth={2}
                  >
                    {pieData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        opacity={entry.realValue === 0 ? 0.15 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<CustomTooltip total={total} />}
                    cursor={false}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend with mini progress bars */}
            <div className="flex flex-col gap-3 w-full min-w-0">
              {SLICES.map((s) => {
                const count = counts[s.key];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                return (
                  <div key={s.key} className="flex items-start gap-2.5">
                    <span
                      className="mt-0.5 inline-block w-3 h-3 rounded-sm shrink-0"
                      style={{ background: s.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-xs font-semibold text-foreground">{s.label}</span>
                        <span
                          className="text-xs font-bold shrink-0 tabular-nums"
                          style={{ color: s.color }}
                        >
                          {count}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-muted rounded-full h-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: s.color }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0 w-7 text-right tabular-nums">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {dominant && (
                <p
                  className="text-[11px] font-medium border-t border-border/40 pt-2 mt-0.5 leading-snug"
                  style={{ color: MATCH_PALETTE.high.text }}
                >
                  {dominant}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
