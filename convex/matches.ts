import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { v, ConvexError } from "convex/values";

const ADMIN_EMAILS = ["sinhasan@gmail.com", "ifundindia@gmail.com"];

function isAdminRole(role: string | undefined | null): boolean {
  return role === "superadmin" || role === "admin";
}

// Helper: check if the current user has paid (or is an admin)
async function assertPaymentAccess(ctx: MutationCtx | QueryCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

  const user = await ctx.db
    .query("users")
    .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
    .unique();
  if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

  // Admins always have access (check email first since role may not be set yet)
  if (ADMIN_EMAILS.includes(user.email ?? "") || isAdminRole(user.role)) return user;

  // Check payment record
  const paid = await ctx.db
    .query("matchingPayments")
    .withIndex("by_userId", (q) => q.eq("userId", user._id))
    .filter((q) => q.eq(q.field("status"), "paid"))
    .first();

  if (!paid) {
    throw new ConvexError({
      message: "Payment required to access matching features",
      code: "FORBIDDEN",
    });
  }

  return user;
}

export const listForCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return [];

    let rawMatches;
    if (user.role === "startup") {
      const startup = await ctx.db.query("startups").withIndex("by_userId", (q) => q.eq("userId", user._id)).first();
      if (!startup) return [];
      rawMatches = await ctx.db.query("matches").withIndex("by_startup", (q) => q.eq("startupId", startup._id)).collect();
    } else if (user.role === "investor") {
      const investor = await ctx.db.query("investors").withIndex("by_userId", (q) => q.eq("userId", user._id)).first();
      if (!investor) return [];
      rawMatches = await ctx.db.query("matches").withIndex("by_investor", (q) => q.eq("investorId", investor._id)).collect();
    } else {
      // admin: sees all — verify they are actually admin
      const ADMIN_EMAILS_LIST = ["sinhasan@gmail.com", "ifundindia@gmail.com"];
      const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS_LIST.includes(user.email ?? "");
      if (!isAdmin) return [];
      rawMatches = await ctx.db.query("matches").collect();
    }

    const enriched = await Promise.all(
      rawMatches.map(async (match) => {
        const startup = await ctx.db.get(match.startupId);
        const investor = await ctx.db.get(match.investorId);
        return { ...match, startup, investor };
      })
    );
    // Filter out orphaned matches where the startup or investor was deleted
    return enriched.filter((m) => m.startup !== null && m.investor !== null);
  },
});

export const list = query({
  args: {
    status: v.optional(v.string()),
    startupId: v.optional(v.id("startups")),
    investorId: v.optional(v.id("investors")),
  },
  handler: async (ctx, args) => {
    let matches;
    if (args.startupId) {
      matches = await ctx.db.query("matches")
        .withIndex("by_startup", (q) => q.eq("startupId", args.startupId!))
        .collect();
    } else if (args.investorId) {
      matches = await ctx.db.query("matches")
        .withIndex("by_investor", (q) => q.eq("investorId", args.investorId!))
        .collect();
    } else {
      matches = await ctx.db.query("matches").collect();
    }

    const enriched = await Promise.all(
      matches.map(async (match) => {
        const startup = await ctx.db.get(match.startupId);
        const investor = await ctx.db.get(match.investorId);
        return { ...match, startup, investor };
      })
    );
    return enriched.filter((m) => m.startup !== null && m.investor !== null);
  },
});

export const create = mutation({
  args: {
    startupId: v.id("startups"),
    investorId: v.id("investors"),
    score: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await assertPaymentAccess(ctx);

    const existing = await ctx.db.query("matches")
      .withIndex("by_startup_investor", (q) =>
        q.eq("startupId", args.startupId).eq("investorId", args.investorId)
      ).unique();
    if (existing) throw new ConvexError({ message: "Match already exists", code: "CONFLICT" });

    return await ctx.db.insert("matches", {
      ...args,
      status: "suggested",
      createdBy: user._id,
    });
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("matches"),
    status: v.union(
      v.literal("suggested"),
      v.literal("intro-requested"),
      v.literal("intro-sent"),
      v.literal("meeting-scheduled"),
      v.literal("deal-closed"),
      v.literal("rejected")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await assertPaymentAccess(ctx);
    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("matches") },
  handler: async (ctx, args) => {
    await assertPaymentAccess(ctx);
    await ctx.db.delete(args.id);
  },
});

export const autoMatch = mutation({
  args: { startupId: v.id("startups") },
  handler: async (ctx, args): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const startup = await ctx.db.get(args.startupId);
    if (!startup) throw new ConvexError({ message: "Startup not found", code: "NOT_FOUND" });

    const investors = await ctx.db.query("investors").collect();

    let created = 0;
    for (const investor of investors) {
      let score = 0;
      if (investor.preferredIndustries.includes(startup.industry)) score += 40;
      if (investor.preferredStages.includes(startup.stage)) score += 30;
      if (startup.fundingNeeded >= investor.minInvestment && startup.fundingNeeded <= investor.maxInvestment) score += 30;

      if (score >= 40) {
        const existing = await ctx.db.query("matches")
          .withIndex("by_startup_investor", (q) =>
            q.eq("startupId", args.startupId).eq("investorId", investor._id)
          ).unique();
        if (!existing) {
          await ctx.db.insert("matches", {
            startupId: args.startupId,
            investorId: investor._id,
            score,
            status: "suggested",
            createdBy: user._id,
          });
          created++;
        }
      }
    }
    return created;
  },
});

export const autoMatchForInvestor = mutation({
  args: { investorId: v.id("investors") },
  handler: async (ctx, args): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const investor = await ctx.db.get(args.investorId);
    if (!investor) throw new ConvexError({ message: "Investor not found", code: "NOT_FOUND" });

    const startups = await ctx.db.query("startups").collect();

    let created = 0;
    for (const startup of startups) {
      let score = 0;
      if (investor.preferredIndustries.includes(startup.industry)) score += 40;
      if (investor.preferredStages.includes(startup.stage)) score += 30;
      if (startup.fundingNeeded >= investor.minInvestment && startup.fundingNeeded <= investor.maxInvestment) score += 30;

      if (score >= 40) {
        const existing = await ctx.db.query("matches")
          .withIndex("by_startup_investor", (q) =>
            q.eq("startupId", startup._id).eq("investorId", args.investorId)
          ).unique();
        if (!existing) {
          await ctx.db.insert("matches", {
            startupId: startup._id,
            investorId: args.investorId,
            score,
            status: "suggested",
            createdBy: user._id,
          });
          created++;
        }
      }
    }
    return created;
  },
});

export const autoMatchAll = mutation({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const startups = await ctx.db.query("startups").collect();
    const investors = await ctx.db.query("investors").collect();

    let created = 0;
    for (const startup of startups) {
      for (const investor of investors) {
        let score = 0;
        if (investor.preferredIndustries.includes(startup.industry)) score += 40;
        if (investor.preferredStages.includes(startup.stage)) score += 30;
        if (startup.fundingNeeded >= investor.minInvestment && startup.fundingNeeded <= investor.maxInvestment) score += 30;

        if (score >= 40) {
          const existing = await ctx.db.query("matches")
            .withIndex("by_startup_investor", (q) =>
              q.eq("startupId", startup._id).eq("investorId", investor._id)
            ).unique();
          if (!existing) {
            await ctx.db.insert("matches", {
              startupId: startup._id,
              investorId: investor._id,
              score,
              status: "suggested",
              createdBy: user._id,
            });
            created++;
          }
        }
      }
    }
    return created;
  },
});

// Payment-gated: request introduction for a match
export const requestIntro = mutation({
  args: { id: v.id("matches") },
  handler: async (ctx, args) => {
    await assertPaymentAccess(ctx);
    await ctx.db.patch(args.id, { status: "intro-requested" });
  },
});

export const getScoreBreakdown = query({
  args: { startupId: v.id("startups"), investorId: v.id("investors") },
  handler: async (ctx, args) => {
    const startup = await ctx.db.get(args.startupId);
    const investor = await ctx.db.get(args.investorId);
    if (!startup || !investor) return null;

    const industryMatch = investor.preferredIndustries.includes(startup.industry);
    const stageMatch = investor.preferredStages.includes(startup.stage);
    const fundingMatch = startup.fundingNeeded >= investor.minInvestment && startup.fundingNeeded <= investor.maxInvestment;
    const score = (industryMatch ? 40 : 0) + (stageMatch ? 30 : 0) + (fundingMatch ? 30 : 0);

    return {
      score,
      breakdown: [
        { label: "Industry match", value: industryMatch ? 40 : 0, max: 40, matched: industryMatch, detail: startup.industry },
        { label: "Stage match", value: stageMatch ? 30 : 0, max: 30, matched: stageMatch, detail: startup.stage },
        { label: "Funding range", value: fundingMatch ? 30 : 0, max: 30, matched: fundingMatch, detail: `$${(startup.fundingNeeded / 1000).toFixed(0)}K` },
      ],
    };
  },
});
