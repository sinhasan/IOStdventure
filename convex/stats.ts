import { query } from "./_generated/server";
import { isAdminRole } from "./users";
import { computeMatchScore } from "./matching.ts";

// Returns personal stats for the current startup/investor user
export const myStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();

    let profileCompletion = 0;
    if (profile) {
      const steps = [profile.step1Complete, profile.step2Complete, profile.step3Complete];
      profileCompletion = Math.round((steps.filter(Boolean).length / 3) * 100);
    }

    // Connections count
    const connections = user.role === "startup"
      ? await ctx.db.query("connections").withIndex("by_startup", (q) => q.eq("startupUserId", user._id)).collect()
      : user.role === "investor"
      ? await ctx.db.query("connections").withIndex("by_investor", (q) => q.eq("investorUserId", user._id)).collect()
      : [];

    const activeConnections = connections.filter((c) => c.status === "active").length;

    return {
      profileCompletion,
      activeConnections,
      role: user.role,
    };
  },
});

export const overview = query({
  args: {},
  handler: async (ctx) => {
    // Only admins can see the full overview
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!caller || !isAdminRole(caller.role)) return null;

    try {
      // Get real total counts with defensive try/catch
      let totalStartupsCount = 0;
      try {
        const allStartups = await ctx.db.query("startups").collect();
        totalStartupsCount = allStartups.length;
      } catch {
        totalStartupsCount = 0;
      }
      let totalInvestorsCount = 0;
      try {
        const allInvestors = await ctx.db.query("investors").collect();
        totalInvestorsCount = allInvestors.length;
      } catch {
        totalInvestorsCount = 0;
      }

      // Use .take() limits for analytics computations on large collections
      const startups = await ctx.db.query("startups").take(2000);
      const investors = await ctx.db.query("investors").take(2000);
      const matches = await ctx.db.query("matches").take(1000);
      const invitations = await ctx.db.query("invitations").take(1000);
      const connections = await ctx.db.query("connections").take(1000);
      const payments = await ctx.db.query("matchingPayments").take(1000);

      const activeStartups = startups.filter((s) => s.status === "active").length;
      const activeInvestors = investors.filter((i) => i.status === "active").length;

      const matchStatusCounts = matches.reduce(
        (acc, m) => { acc[m.status] = (acc[m.status] ?? 0) + 1; return acc; },
        {} as Record<string, number>
      );

      const industryBreakdown = startups.reduce(
        (acc, s) => { acc[s.industry] = (acc[s.industry] ?? 0) + 1; return acc; },
        {} as Record<string, number>
      );

      const stageBreakdown = startups.reduce(
        (acc, s) => { acc[s.stage] = (acc[s.stage] ?? 0) + 1; return acc; },
        {} as Record<string, number>
      );

      const investorTypeBreakdown = investors.reduce(
        (acc, i) => { acc[i.type] = (acc[i.type] ?? 0) + 1; return acc; },
        {} as Record<string, number>
      );

      const totalFundingNeeded = startups.reduce((sum, s) => sum + s.fundingNeeded, 0);
      const totalFundingAvailable = investors.reduce((sum, i) => sum + i.maxInvestment, 0);

      const avgMatchScore =
        matches.length > 0
          ? matches.reduce((sum, m) => sum + m.score, 0) / matches.length
          : 0;

      const pendingInvitations = invitations.filter((i) => i.status === "pending").length;
      const acceptedInvitations = invitations.filter((i) => i.status === "accepted").length;
      const dealsClosedCount = matchStatusCounts["deal-closed"] ?? 0;

      const funnelStages = [
        { stage: "suggested", label: "Suggested", count: matchStatusCounts["suggested"] ?? 0 },
        { stage: "intro-requested", label: "Intro Requested", count: matchStatusCounts["intro-requested"] ?? 0 },
        { stage: "intro-sent", label: "Intro Sent", count: matchStatusCounts["intro-sent"] ?? 0 },
        { stage: "meeting-scheduled", label: "Meeting", count: matchStatusCounts["meeting-scheduled"] ?? 0 },
        { stage: "deal-closed", label: "Deal Closed", count: matchStatusCounts["deal-closed"] ?? 0 },
      ];

      // Top 5 matches by score (enriched)
      const topMatchIds = [...matches].sort((a, b) => b.score - a.score).slice(0, 5);
      const topMatches = await Promise.all(
        topMatchIds.map(async (m) => {
          const startup = await ctx.db.get(m.startupId);
          const investor = await ctx.db.get(m.investorId);
          return {
            id: m._id,
            score: m.score,
            status: m.status,
            startupName: startup?.name ?? "Unknown",
            investorName: investor?.name ?? "Unknown",
            industry: startup?.industry ?? "",
          };
        })
      );

      // Recent activity: last 8 matches by creation time
      const recentMatches = [...matches].sort((a, b) => b._creationTime - a._creationTime).slice(0, 8);
      const recentActivity = await Promise.all(
        recentMatches.map(async (m) => {
          const startup = await ctx.db.get(m.startupId);
          const investor = await ctx.db.get(m.investorId);
          return {
            id: m._id,
            type: "match" as const,
            status: m.status,
            startupName: startup?.name ?? "Unknown",
            investorName: investor?.name ?? "Unknown",
            score: m.score,
            createdAt: m._creationTime,
          };
        })
      );

      const conversionRate = matches.length > 0
        ? Math.round((dealsClosedCount / matches.length) * 100)
        : 0;

      const totalConnections = connections.length;
      const activeConnections = connections.filter((c) => c.status === "active").length;
      const totalRevenue = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + p.amount, 0);

      // ── Smart match analytics: cap to first 50 startups × 100 investors ──
      // Full Cartesian product over thousands of records exceeds Convex limits.
      const allUserProfiles = await ctx.db.query("userProfiles").take(500);
      type ProfileDoc = typeof allUserProfiles[number];
      const profileByUserId = new Map<string, ProfileDoc>();
      for (const p of allUserProfiles) profileByUserId.set(p.userId, p);

      const sampleStartups = startups.filter((s) => s.status === "active").slice(0, 50);
      const sampleInvestors = investors.filter((i) => i.status === "active").slice(0, 100);

      type MatchPair = { startupName: string; investorName: string; score: number };
      const allPairs: MatchPair[] = [];

      for (const s of sampleStartups) {
        const sp = s.userId ? profileByUserId.get(s.userId) : undefined;
        const startupData = {
          industry: sp?.industry ?? s.industry,
          sectors: sp?.sectors ?? s.tags,
          stage: sp?.startupStage ?? s.stage,
          amountSeeking: sp?.amountSeeking ?? s.fundingNeeded,
        };
        for (const inv of sampleInvestors) {
          const ip = inv.userId ? profileByUserId.get(inv.userId) : undefined;
          const investorData = {
            preferredIndustries: inv.preferredIndustries,
            preferredSectors: ip?.preferredSectors,
            preferredStages: [...inv.preferredStages, ...(ip?.preferredStages ?? [])],
            minTicket: ip?.minTicket ?? inv.minInvestment,
            maxTicket: ip?.maxTicket ?? inv.maxInvestment,
          };
          const { score, isIncomplete } = computeMatchScore(startupData, investorData);
          if (!isIncomplete) {
            allPairs.push({ startupName: s.name, investorName: inv.name, score });
          }
        }
      }

      const avgSmartMatchScore = allPairs.length > 0
        ? Math.round(allPairs.reduce((sum, p) => sum + p.score, 0) / allPairs.length)
        : 0;
      const highMatchPairs = allPairs.filter((p) => p.score >= 70).length;
      const mediumMatchPairs = allPairs.filter((p) => p.score >= 40 && p.score < 70).length;
      const lowMatchPairs = allPairs.filter((p) => p.score < 40).length;
      const top10Matches = [...allPairs].sort((a, b) => b.score - a.score).slice(0, 10);

      return {
        totalStartups: totalStartupsCount,
        activeStartups,
        totalInvestors: totalInvestorsCount,
        activeInvestors,
        totalMatches: matches.length,
        matchStatusCounts,
        industryBreakdown,
        stageBreakdown,
        investorTypeBreakdown,
        totalFundingNeeded,
        totalFundingAvailable,
        avgMatchScore: Math.round(avgMatchScore),
        pendingInvitations,
        acceptedInvitations,
        totalInvitations: invitations.length,
        dealsClosedCount,
        funnelStages,
        topMatches,
        recentActivity,
        conversionRate,
        rejectedCount: matchStatusCounts["rejected"] ?? 0,
        totalConnections,
        activeConnections,
        totalRevenue,
        avgSmartMatchScore,
        highMatchPairs,
        mediumMatchPairs,
        lowMatchPairs,
        top10Matches,
      };
    } catch (err) {
      console.error("stats:overview error", err);
      // Return safe defaults so the dashboard renders instead of crashing
      return {
        totalStartups: 0,
        activeStartups: 0,
        totalInvestors: 0,
        activeInvestors: 0,
        totalMatches: 0,
        matchStatusCounts: {},
        industryBreakdown: {},
        stageBreakdown: {},
        investorTypeBreakdown: {},
        totalFundingNeeded: 0,
        totalFundingAvailable: 0,
        avgMatchScore: 0,
        pendingInvitations: 0,
        acceptedInvitations: 0,
        totalInvitations: 0,
        dealsClosedCount: 0,
        funnelStages: [],
        topMatches: [],
        recentActivity: [],
        conversionRate: 0,
        rejectedCount: 0,
        totalConnections: 0,
        activeConnections: 0,
        totalRevenue: 0,
        avgSmartMatchScore: 0,
        highMatchPairs: 0,
        mediumMatchPairs: 0,
        lowMatchPairs: 0,
        top10Matches: [],
      };
    }
  },
});

