// Smart matching algorithm between startups and investors
// Score breakdown: Sector (40) + Stage (30) + Ticket Size (30) = max 100

export type StartupMatchData = {
  industry?: string | null;       // Primary industry from startups table or userProfile
  sectors?: string[] | null;      // Additional sectors from userProfile
  stage?: string | null;          // Stage string
  amountSeeking?: number | null;  // Funding ask in ₹
};

export type InvestorMatchData = {
  preferredIndustries?: string[] | null;  // From investors table
  preferredSectors?: string[] | null;     // From userProfile
  preferredStages?: string[] | null;      // Combined stages list
  minTicket?: number | null;
  maxTicket?: number | null;
};

export type MatchResult = {
  score: number;            // 0–100
  sectorScore: number;      // 0, 20, or 40
  stageScore: number;       // 0 or 30
  ticketScore: number;      // 0, 15, or 30
  isIncomplete: boolean;    // True if either party lacks enough data to score
};

// Normalize sector/industry strings for comparison
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function sectorsMatch(a: string[], b: string[]): "full" | "partial" | "none" {
  const normA = a.map(normalize);
  const normB = b.map(normalize);
  const fullMatch = normA.some((x) => normB.includes(x));
  if (fullMatch) return "full";
  // Partial: any word overlap
  const wordsA = normA.flatMap((s) => s.split(/\s+/));
  const wordsB = normB.flatMap((s) => s.split(/\s+/));
  const partial = wordsA.some((w) => w.length > 3 && wordsB.includes(w));
  return partial ? "partial" : "none";
}

export function computeMatchScore(
  startup: StartupMatchData,
  investor: InvestorMatchData
): MatchResult {
  // Collect all startup sectors
  const startupSectors: string[] = [
    ...(startup.industry ? [startup.industry] : []),
    ...(startup.sectors ?? []),
  ];

  // Collect all investor preferred sectors
  const investorSectors: string[] = [
    ...(investor.preferredIndustries ?? []),
    ...(investor.preferredSectors ?? []),
  ];

  // Check for incomplete profiles — if no sector or stage data on either side
  const hasStartupData = startupSectors.length > 0 || startup.stage;
  const hasInvestorData = investorSectors.length > 0 || (investor.preferredStages?.length ?? 0) > 0;
  const isIncomplete = !hasStartupData || !hasInvestorData;

  // ── Sector score (40 pts) ──
  let sectorScore = 0;
  if (startupSectors.length > 0 && investorSectors.length > 0) {
    const match = sectorsMatch(startupSectors, investorSectors);
    if (match === "full") sectorScore = 40;
    else if (match === "partial") sectorScore = 20;
  }

  // ── Stage score (30 pts) ──
  let stageScore = 0;
  const startupStage = startup.stage ? normalize(startup.stage) : null;
  const investorStages = (investor.preferredStages ?? []).map(normalize);
  if (startupStage && investorStages.length > 0) {
    if (investorStages.includes(startupStage)) stageScore = 30;
  }

  // ── Ticket size score (30 pts) ──
  let ticketScore = 0;
  const ask = startup.amountSeeking;
  const minT = investor.minTicket;
  const maxT = investor.maxTicket;

  if (ask != null && minT != null && maxT != null && maxT > 0) {
    if (ask >= minT && ask <= maxT) {
      ticketScore = 30;
    } else {
      // Within 50% range: ask is within 50% above or below the ticket range
      const lowerBound = minT * 0.5;
      const upperBound = maxT * 1.5;
      if (ask >= lowerBound && ask <= upperBound) {
        ticketScore = 15;
      }
    }
  }

  const score = sectorScore + stageScore + ticketScore;
  return { score, sectorScore, stageScore, ticketScore, isIncomplete };
}
