import { query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";

export const SECTOR_PACK_FEE = 11999;
export const FULL_ACCESS_FEE = 59999;

// ── Connection pricing (exported for admin stats) ──
export const STARTUP_CONNECT_FEE         = 199;
export const STARTUP_PARTNER_CONNECT_FEE = 149;
export const INVESTOR_CONNECT_FEE        = 399;
export const INVESTOR_PARTNER_CONNECT_FEE = 299;

// Legacy alias — kept so any existing imports don't break
export const SINGLE_CONNECT_FEE = STARTUP_CONNECT_FEE;

export const ALL_SECTORS = [
  "FinTech", "HealthTech", "SaaS", "AI/ML", "CleanTech",
  "EdTech", "Consumer", "DeepTech",
] as const;

// Six months in ms
const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function sixMonthsFromNow(): string {
  return new Date(Date.now() + SIX_MONTHS_MS).toISOString();
}

// ── Query: get the current user's active tier info ──
export const getMyTiers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;
    const now = new Date().toISOString();

    const fullAccess = await ctx.db
      .query("fullAccessPasses")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    const hasFullAccess = !!fullAccess && fullAccess.expiresAt > now;

    const sectorPacks = await ctx.db
      .query("sectorPacks")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const activeSectors = sectorPacks
      .filter((p) => p.expiresAt > now)
      .map((p) => p.sector);

    return {
      hasFullAccess,
      fullAccessExpiresAt: hasFullAccess ? fullAccess!.expiresAt : null,
      activeSectors,
    };
  },
});

// ── Internal Mutation: activate a Sector Pack ──
export const activateSectorPackInternal = internalMutation({
  args: { orderId: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sectorPacks")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (existing) return existing.sector;

    const parts = args.orderId.split("_");
    const sector = decodeURIComponent(parts[1] ?? "");

    await ctx.db.insert("sectorPacks", {
      userId: args.userId,
      sector,
      orderId: args.orderId,
      expiresAt: sixMonthsFromNow(),
      status: "active",
    });
    return sector;
  },
});

// NOTE: activateSectorPack public mutation removed.
// Sector Pack activation now happens ONLY via Cashfree webhook → webhookActivations.insertSectorPack.

// ── Internal Mutation: activate Full Access Pass ──
export const activateFullAccessInternal = internalMutation({
  args: { orderId: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fullAccessPasses")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (existing) return;

    await ctx.db.insert("fullAccessPasses", {
      userId: args.userId,
      orderId: args.orderId,
      expiresAt: sixMonthsFromNow(),
      status: "active",
    });
  },
});

// NOTE: activateFullAccess public mutation removed.
// Full Access Pass activation now happens ONLY via Cashfree webhook → webhookActivations.insertFullAccessPass.

// ── Internal: expire passes that have passed their expiresAt ──
export const expirePasses = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const expiredPacks = await ctx.db
      .query("sectorPacks")
      .filter((q) => q.and(q.eq(q.field("status"), "active"), q.lt(q.field("expiresAt"), now)))
      .collect();
    for (const pack of expiredPacks) {
      await ctx.db.patch(pack._id, { status: "expired" });
    }
    const expiredPasses = await ctx.db
      .query("fullAccessPasses")
      .filter((q) => q.and(q.eq(q.field("status"), "active"), q.lt(q.field("expiresAt"), now)))
      .collect();
    for (const pass of expiredPasses) {
      await ctx.db.patch(pass._id, { status: "expired" });
    }
  },
});

// ── Internal: find passes expiring in 30 days for email reminders ──
export const getPassesDueSoon = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = new Date().toISOString();
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const passes = await ctx.db
      .query("fullAccessPasses")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .filter((q) => q.and(
        q.gt(q.field("expiresAt"), now),
        q.lt(q.field("expiresAt"), thirtyDaysFromNow),
        q.neq(q.field("renewalReminderSent"), true)
      ))
      .collect();
    const result: { passId: Id<"fullAccessPasses">; userId: Id<"users">; expiresAt: string }[] = [];
    for (const pass of passes) {
      result.push({ passId: pass._id, userId: pass.userId, expiresAt: pass.expiresAt });
      await ctx.db.patch(pass._id, { renewalReminderSent: true });
    }
    return result;
  },
});

// ── Admin: get tier stats for dashboard ──
export const getTierStats = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) return null;

    const now = new Date().toISOString();
    const allPasses = await ctx.db.query("fullAccessPasses").collect();
    const activePasses = allPasses.filter((p) => p.status === "active" && p.expiresAt > now);
    const expiredPasses = allPasses.filter((p) => p.status === "expired" || p.expiresAt <= now);

    const allSectorPacks = await ctx.db.query("sectorPacks").collect();
    const sectorPackBySector: Record<string, number> = {};
    for (const pack of allSectorPacks) {
      sectorPackBySector[pack.sector] = (sectorPackBySector[pack.sector] ?? 0) + 1;
    }

    const payments = await ctx.db.query("matchingPayments").collect();
    const paidPayments = payments.filter((p) => p.status === "paid");
    // Count all valid connection amounts as single connect revenue
    const validAmounts = new Set([STARTUP_CONNECT_FEE, STARTUP_PARTNER_CONNECT_FEE, INVESTOR_CONNECT_FEE, INVESTOR_PARTNER_CONNECT_FEE]);
    const singleConnectRevenue = paidPayments
      .filter((p) => validAmounts.has(p.amount))
      .reduce((sum, p) => sum + p.amount, 0);
    const sectorPackRevenue = allSectorPacks.length * SECTOR_PACK_FEE;
    const fullAccessRevenue = allPasses.length * FULL_ACCESS_FEE;

    return {
      activeFullAccess: activePasses.length,
      expiredFullAccess: expiredPasses.length,
      totalFullAccessPurchases: allPasses.length,
      sectorPackBySector,
      totalSectorPacks: allSectorPacks.length,
      singleConnectRevenue,
      sectorPackRevenue,
      fullAccessRevenue,
      totalRevenue: singleConnectRevenue + sectorPackRevenue + fullAccessRevenue,
    };
  },
});
