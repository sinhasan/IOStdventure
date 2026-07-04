import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Id } from "./_generated/dataModel.d.ts";
import { computeMatchScore } from "./matching.ts";

const ADMIN_EMAILS = ["sinhasan@gmail.com", "ifundindia@gmail.com"];
const STARTUP_CONNECTION_FEE = 199;
const STARTUP_PARTNER_CONNECTION_FEE = 149;
const INVESTOR_CONNECTION_FEE = 399;
const INVESTOR_PARTNER_CONNECTION_FEE = 299;

function isAdminRole(role: string | undefined | null): boolean {
  return role === "superadmin" || role === "admin";
}

// Mask a full name to "First L." format
function maskName(firstName?: string, lastName?: string, fallback?: string): string {
  if (firstName) {
    const initial = lastName ? lastName[0].toUpperCase() + "." : "";
    return initial ? `${firstName} ${initial}` : firstName;
  }
  if (fallback) {
    const parts = fallback.trim().split(" ");
    if (parts.length >= 2) return `${parts[0]} ${parts[1][0].toUpperCase()}.`;
    return parts[0];
  }
  return "Anonymous";
}

// ── Discovery: investors browse startups, startups browse investors ──

// Returns startup profiles for investors to browse.
// Merges self-registered startup users (via userProfiles) AND admin-added startups (from startups table).
export const discoverStartups = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const viewer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!viewer) return [];

    // Only investors (and admins) can browse startups
    const isAdmin = isAdminRole(viewer.role) || ADMIN_EMAILS.includes(viewer.email ?? "");
    if (!isAdmin && viewer.role !== "investor") return [];

    // Get connected startup IDs (user-linked) via connections table
    const myConnections = isAdmin ? [] : await ctx.db
      .query("connections")
      .withIndex("by_investor", (q) => q.eq("investorUserId", viewer._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const connectedStartupUserIds = new Set(myConnections.map((c) => c.startupUserId));

    // Get unlocked admin-added startup IDs via contactUnlocks table
    const myUnlocks = isAdmin ? [] : await ctx.db
      .query("contactUnlocks")
      .withIndex("by_unlocker", (q) => q.eq("unlockerUserId", viewer._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const unlockedProfileIds = new Set(
      myUnlocks.filter((u) => u.targetType === "startup").map((u) => u.targetProfileId)
    );

    // Check premium tier access
    const now = new Date().toISOString();
    const fullAccessPass = isAdmin ? null : await ctx.db
      .query("fullAccessPasses")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    const hasFullAccess = isAdmin || (!!fullAccessPass && fullAccessPass.expiresAt > now);

    const sectorPacks = isAdmin ? [] : await ctx.db
      .query("sectorPacks")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const activeSectors = new Set(sectorPacks.filter((p) => p.expiresAt > now).map((p) => p.sector));

    const result: {
      profileId: string;
      userId: string;
      maskedName: string;
      fullName: string | null;
      industry: string | undefined;
      startupStage: string | undefined;
      sectors: string[] | undefined;
      bio: string | null;
      startupName: string | null;
      oneLinerPitch: string | null;
      website: string | null;
      linkedInUrl: string | null;
      amountSeeking: number | null;
      email: string | null;
      isConnected: boolean;
      isVerified: boolean;
      isAdminAdded?: boolean;
      isSectorUnlocked?: boolean;
      isFullAccessUnlocked?: boolean;
      showConnectButton: boolean;
      matchScore: number;
      isIncomplete: boolean;
    }[] = [];

    // Load investor's profile for matching (if self-registered)
    const viewerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .first();
    const viewerRecord = await ctx.db
      .query("investors")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .first();
    const investorMatchData = {
      preferredIndustries: viewerRecord?.preferredIndustries,
      preferredSectors: viewerProfile?.preferredSectors,
      preferredStages: [
        ...(viewerRecord?.preferredStages ?? []),
        ...(viewerProfile?.preferredStages ?? []),
      ],
      minTicket: viewerProfile?.minTicket ?? viewerRecord?.minInvestment,
      maxTicket: viewerProfile?.maxTicket ?? viewerRecord?.maxInvestment,
    };

    // 1. Self-registered startup users (from userProfiles table)
    const seenUserIds = new Set<string>();
    const profiles = await ctx.db.query("userProfiles").collect();
    for (const p of profiles) {
      const user = await ctx.db.get(p.userId);
      if (!user || user.role !== "startup") continue;
      seenUserIds.add(user._id);

      const isConnected = isAdmin || hasFullAccess || connectedStartupUserIds.has(user._id);
      // Sector pack: check if startup's sectors overlap with viewer's active sector packs
      const sectorUnlocked = !isConnected && activeSectors.size > 0 && (
        (p.sectors ?? []).some((s: string) => activeSectors.has(s)) ||
        (!!p.industry && activeSectors.has(p.industry))
      );
      const effectivelyConnected = isConnected || sectorUnlocked;
      const startupMatchData = {
        industry: p.industry,
        sectors: p.sectors,
        stage: p.startupStage,
        amountSeeking: p.amountSeeking,
      };
      const matchResult = isAdmin
        ? { score: 0, isIncomplete: false }
        : computeMatchScore(startupMatchData, investorMatchData);
      result.push({
        profileId: p._id,
        userId: user._id,
        maskedName: maskName(p.firstName, p.lastName, user.name),
        fullName: effectivelyConnected ? ((`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()) || user.name || null) : null,
        industry: p.industry,
        startupStage: p.startupStage,
        sectors: p.sectors,
        bio: effectivelyConnected ? (p.bio ?? null) : null,
        startupName: effectivelyConnected ? (p.startupName ?? null) : (p.startupName ? p.startupName.split(" ")[0] + "..." : null),
        oneLinerPitch: effectivelyConnected ? (p.oneLinerPitch ?? null) : null,
        website: effectivelyConnected ? (p.website ?? null) : null,
        linkedInUrl: effectivelyConnected ? (p.linkedInUrl ?? null) : null,
        amountSeeking: effectivelyConnected ? (p.amountSeeking ?? null) : null,
        email: effectivelyConnected ? (user.email ?? null) : null,
        isConnected: effectivelyConnected,
        isVerified: false,
        isSectorUnlocked: sectorUnlocked === true,
        isFullAccessUnlocked: !!(hasFullAccess && !isAdmin),
        showConnectButton: !effectivelyConnected && !isAdmin,
        matchScore: matchResult.score,
        isIncomplete: matchResult.isIncomplete,
      });
    }

    // 2. Admin-added startups (from startups table, no linked userId or userId not in seenUserIds)
    const adminStartups = await ctx.db.query("startups")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    for (const s of adminStartups) {
      // Skip if this startup is linked to a user we already included
      if (s.userId && seenUserIds.has(s.userId)) continue;

      // Admin-added profiles: only unlock via individual ₹599 Connect OR ₹59,999 Full Access Pass.
      // Sector packs do NOT unlock admin-added profiles (bulk imports have generic sector lists
      // that would unlock the entire directory for any sector pack purchase).
      const isUnlocked = isAdmin || hasFullAccess || unlockedProfileIds.has(s._id);
      const adminStartupMatchData = {
        industry: s.industry,
        sectors: s.tags,
        stage: s.stage,
        amountSeeking: s.fundingNeeded,
      };
      const adminMatchResult = isAdmin
        ? { score: 0, isIncomplete: false }
        : computeMatchScore(adminStartupMatchData, investorMatchData);
      result.push({
        profileId: s._id,
        userId: s._id, // Not a real user ID — flag via isAdminAdded
        maskedName: (() => {
          const parts = s.name.trim().split(" ");
          if (isUnlocked || parts.length === 1) return s.name;
          return `${parts[0]} ${parts[1][0]}.`;
        })(),
        fullName: isUnlocked ? s.name : null,
        industry: s.industry,
        startupStage: s.stage,
        sectors: s.tags,
        bio: isUnlocked ? s.description : null,
        startupName: isUnlocked ? s.name : (s.name.split(" ")[0] + "..."),
        oneLinerPitch: null,
        website: isUnlocked ? (s.website ?? null) : null,
        linkedInUrl: null,
        amountSeeking: s.fundingNeeded,
        email: isUnlocked ? s.email : null,
        isConnected: isUnlocked,
        isVerified: true,
        isAdminAdded: true,
        isSectorUnlocked: false,
        isFullAccessUnlocked: hasFullAccess && !isAdmin,
        showConnectButton: !isUnlocked && !isAdmin,
        matchScore: adminMatchResult.score,
        isIncomplete: adminMatchResult.isIncomplete,
      });
    }

    // Sort: incomplete at bottom, then by matchScore descending
    result.sort((a, b) => {
      if (a.isIncomplete && !b.isIncomplete) return 1;
      if (!a.isIncomplete && b.isIncomplete) return -1;
      return b.matchScore - a.matchScore;
    });

    return result;
  },
});

// Returns investor profiles for startups to browse.
// Merges self-registered investor users (via userProfiles) AND admin-added investors (from investors table).
export const discoverInvestors = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const viewer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!viewer) return [];

    const isAdmin = isAdminRole(viewer.role) || ADMIN_EMAILS.includes(viewer.email ?? "");
    if (!isAdmin && viewer.role !== "startup") return [];

    const myConnections = isAdmin ? [] : await ctx.db
      .query("connections")
      .withIndex("by_startup", (q) => q.eq("startupUserId", viewer._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const connectedInvestorUserIds = new Set(myConnections.map((c) => c.investorUserId));

    // Get unlocked admin-added investor IDs via contactUnlocks table
    const myUnlocks = isAdmin ? [] : await ctx.db
      .query("contactUnlocks")
      .withIndex("by_unlocker", (q) => q.eq("unlockerUserId", viewer._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const unlockedProfileIds = new Set(
      myUnlocks.filter((u) => u.targetType === "investor").map((u) => u.targetProfileId)
    );

    // Check premium tier access
    const now = new Date().toISOString();
    const fullAccessPass = isAdmin ? null : await ctx.db
      .query("fullAccessPasses")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .first();
    const hasFullAccess = isAdmin || (!!fullAccessPass && fullAccessPass.expiresAt > now);

    const sectorPacks = isAdmin ? [] : await ctx.db
      .query("sectorPacks")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
    const activeSectors = new Set(sectorPacks.filter((p) => p.expiresAt > now).map((p) => p.sector));

    const result: {
      profileId: string;
      userId: string;
      maskedName: string;
      fullName: string | null;
      firmName: string | null;
      investorType: string | undefined;
      preferredSectors: string[] | undefined;
      bio: string | null;
      minTicket: number | null;
      maxTicket: number | null;
      website: string | null;
      linkedInUrl: string | null;
      email: string | null;
      isConnected: boolean;
      isVerified: boolean;
      isAdminAdded?: boolean;
      isSectorUnlocked?: boolean;
      isFullAccessUnlocked?: boolean;
      showConnectButton: boolean;
      matchScore: number;
      isIncomplete: boolean;
    }[] = [];

    // Load startup's profile for matching (if self-registered)
    const viewerProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .first();
    const viewerRecord = await ctx.db
      .query("startups")
      .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
      .first();
    const startupMatchData = {
      industry: viewerProfile?.industry ?? viewerRecord?.industry,
      sectors: viewerProfile?.sectors ?? viewerRecord?.tags,
      stage: viewerProfile?.startupStage ?? viewerRecord?.stage,
      amountSeeking: viewerProfile?.amountSeeking ?? viewerRecord?.fundingNeeded,
    };

    // 1. Self-registered investor users (from userProfiles table)
    const seenUserIds = new Set<string>();
    const profiles = await ctx.db.query("userProfiles").collect();
    for (const p of profiles) {
      const user = await ctx.db.get(p.userId);
      if (!user || user.role !== "investor") continue;
      seenUserIds.add(user._id);

      const isConnected = isAdmin || hasFullAccess || connectedInvestorUserIds.has(user._id);
      // Sector pack: check if investor's sectors overlap with viewer's active sector packs
      const sectorUnlocked = !isConnected && activeSectors.size > 0 && (
        (p.preferredSectors ?? []).some((s: string) => activeSectors.has(s))
      );
      const effectivelyConnected = isConnected || sectorUnlocked;
      const investorMatchData = {
        preferredIndustries: undefined as string[] | undefined,
        preferredSectors: p.preferredSectors,
        preferredStages: p.preferredStages,
        minTicket: p.minTicket,
        maxTicket: p.maxTicket,
      };
      const matchResult = isAdmin
        ? { score: 0, isIncomplete: false }
        : computeMatchScore(startupMatchData, investorMatchData);
      result.push({
        profileId: p._id,
        userId: user._id,
        maskedName: maskName(p.firstName, p.lastName, user.name),
        fullName: effectivelyConnected ? ((`${p.firstName ?? ""} ${p.lastName ?? ""}`.trim()) || user.name || null) : null,
        firmName: effectivelyConnected ? (p.firmName ?? null) : (p.firmName ? p.firmName.split(" ")[0] + "..." : null),
        investorType: p.investorType,
        preferredSectors: p.preferredSectors,
        bio: effectivelyConnected ? (p.bio ?? null) : null,
        minTicket: effectivelyConnected ? (p.minTicket ?? null) : null,
        maxTicket: effectivelyConnected ? (p.maxTicket ?? null) : null,
        website: effectivelyConnected ? (p.website ?? null) : null,
        linkedInUrl: effectivelyConnected ? (p.linkedInUrl ?? null) : null,
        email: effectivelyConnected ? (user.email ?? null) : null,
        isConnected: effectivelyConnected,
        isVerified: false,
        isSectorUnlocked: sectorUnlocked,
        isFullAccessUnlocked: hasFullAccess && !isAdmin,
        showConnectButton: !effectivelyConnected && !isAdmin,
        matchScore: matchResult.score,
        isIncomplete: matchResult.isIncomplete,
      });
    }

    // 2. Admin-added investors (from investors table, no linked userId or userId not in seenUserIds)
    const adminInvestors = await ctx.db.query("investors")
      .withIndex("by_status", (q) => q.eq("status", "active"))
      .collect();
    for (const inv of adminInvestors) {
      if (inv.userId && seenUserIds.has(inv.userId)) continue;

      // Admin-added profiles: only unlock via individual ₹599 Connect OR ₹59,999 Full Access Pass.
      // Sector packs do NOT unlock admin-added profiles (bulk imports have generic sector lists
      // that would unlock the entire directory for any sector pack purchase).
      const isUnlocked = isAdmin || hasFullAccess || unlockedProfileIds.has(inv._id);
      const maskedName = (() => {
        const parts = inv.name.trim().split(" ");
        if (isUnlocked || parts.length === 1) return inv.name;
        return `${parts[0]} ${parts[1][0]}.`;
      })();
      const adminInvestorMatchData = {
        preferredIndustries: inv.preferredIndustries,
        preferredSectors: undefined as string[] | undefined,
        preferredStages: inv.preferredStages,
        minTicket: inv.minInvestment,
        maxTicket: inv.maxInvestment,
      };
      const adminMatchResult = isAdmin
        ? { score: 0, isIncomplete: false }
        : computeMatchScore(startupMatchData, adminInvestorMatchData);
      result.push({
        profileId: inv._id,
        userId: inv._id, // Not a real user ID — flag via isAdminAdded
        maskedName,
        fullName: isUnlocked ? inv.name : null,
        firmName: isUnlocked ? (inv.firmName ?? inv.name ?? null) : ((inv.firmName ?? inv.name ?? "").split(" ")[0] + "..."),
        investorType: inv.type,
        preferredSectors: inv.preferredIndustries,
        bio: isUnlocked ? inv.description : null,
        minTicket: isUnlocked ? inv.minInvestment : null,
        maxTicket: isUnlocked ? inv.maxInvestment : null,
        website: isUnlocked ? (inv.website ?? null) : null,
        linkedInUrl: null,
        email: isUnlocked ? inv.email : null,
        isConnected: isUnlocked,
        isVerified: true,
        isAdminAdded: true,
        isSectorUnlocked: false,
        isFullAccessUnlocked: hasFullAccess && !isAdmin,
        showConnectButton: !isUnlocked && !isAdmin,
        matchScore: adminMatchResult.score,
        isIncomplete: adminMatchResult.isIncomplete,
      });
    }

    // Sort: incomplete at bottom, then by matchScore descending
    result.sort((a, b) => {
      if (a.isIncomplete && !b.isIncomplete) return 1;
      if (!a.isIncomplete && b.isIncomplete) return -1;
      return b.matchScore - a.matchScore;
    });

    return result;
  },
});

// ── My Connections ──

export const getMyConnections = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const viewer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!viewer) return [];

    const isAdmin = isAdminRole(viewer.role) || ADMIN_EMAILS.includes(viewer.email ?? "");

    let connections;
    if (isAdmin) {
      connections = await ctx.db.query("connections").collect();
    } else if (viewer.role === "startup") {
      connections = await ctx.db
        .query("connections")
        .withIndex("by_startup", (q) => q.eq("startupUserId", viewer._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
    } else if (viewer.role === "investor") {
      connections = await ctx.db
        .query("connections")
        .withIndex("by_investor", (q) => q.eq("investorUserId", viewer._id))
        .filter((q) => q.eq(q.field("status"), "active"))
        .collect();
    } else {
      return [];
    }

    // Enrich with profile data
    return await Promise.all(
      connections.map(async (conn) => {
        const startupUser = await ctx.db.get(conn.startupUserId);
        const investorUser = await ctx.db.get(conn.investorUserId);

        const startupProfile = startupUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", startupUser._id))
              .first()
          : null;

        const investorProfile = investorUser
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", investorUser._id))
              .first()
          : null;

        return {
          connectionId: conn._id,
          status: conn.status,
          startup: {
            userId: conn.startupUserId,
            name: startupProfile
              ? `${startupProfile.firstName ?? ""} ${startupProfile.lastName ?? ""}`.trim() || startupUser?.name
              : startupUser?.name,
            email: startupUser?.email,
            startupName: startupProfile?.startupName,
            industry: startupProfile?.industry,
            startupStage: startupProfile?.startupStage,
            amountSeeking: startupProfile?.amountSeeking,
            website: startupProfile?.website,
            linkedInUrl: startupProfile?.linkedInUrl,
            bio: startupProfile?.bio,
          },
          investor: {
            userId: conn.investorUserId,
            name: investorProfile
              ? `${investorProfile.firstName ?? ""} ${investorProfile.lastName ?? ""}`.trim() || investorUser?.name
              : investorUser?.name,
            email: investorUser?.email,
            firmName: investorProfile?.firmName,
            investorType: investorProfile?.investorType,
            minTicket: investorProfile?.minTicket,
            maxTicket: investorProfile?.maxTicket,
            website: investorProfile?.website,
            linkedInUrl: investorProfile?.linkedInUrl,
            bio: investorProfile?.bio,
          },
        };
      })
    );
  },
});

// ── Initiate a connection (creates pending_payment record) ──
export const initiateConnection = mutation({
  args: { targetUserId: v.id("users") },
  handler: async (ctx, args): Promise<{ connectionId: Id<"connections"> }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    const viewer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!viewer) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    const target = await ctx.db.get(args.targetUserId);
    if (!target) throw new ConvexError({ code: "NOT_FOUND", message: "Target user not found" });

    // Determine startup/investor ordering
    let startupUserId: Id<"users">;
    let investorUserId: Id<"users">;

    if (viewer.role === "startup" && target.role === "investor") {
      startupUserId = viewer._id;
      investorUserId = target._id;
    } else if (viewer.role === "investor" && target.role === "startup") {
      startupUserId = target._id;
      investorUserId = viewer._id;
    } else {
      throw new ConvexError({ code: "BAD_REQUEST", message: "Connections can only be made between a startup and an investor" });
    }

    // Check if connection already exists
    const existing = await ctx.db
      .query("connections")
      .withIndex("by_startup_investor", (q) =>
        q.eq("startupUserId", startupUserId).eq("investorUserId", investorUserId)
      )
      .first();

    if (existing) {
      if (existing.status === "active") {
        throw new ConvexError({ code: "CONFLICT", message: "Already connected" });
      }
      // Return existing pending connection
      return { connectionId: existing._id };
    }

    const connectionId = await ctx.db.insert("connections", {
      startupUserId,
      investorUserId,
      initiatorUserId: viewer._id,
      status: "pending_payment",
    });

    return { connectionId };
  },
});

// ── Activate a connection after confirmed payment ──
export const activateConnection = mutation({
  args: { connectionId: v.id("connections"), paymentLinkId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    const conn = await ctx.db.get(args.connectionId);
    if (!conn) throw new ConvexError({ code: "NOT_FOUND", message: "Connection not found" });

    await ctx.db.patch(conn._id, {
      status: "active",
      paymentLinkId: args.paymentLinkId,
    });
  },
});

// ── Get connection fee ──
export const getConnectionFee = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return STARTUP_CONNECTION_FEE;
    const viewer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    const partner = viewer
      ? await ctx.db.query("partners")
          .withIndex("by_userId", (q) => q.eq("userId", viewer._id))
          .unique()
      : null;
    const isPartner = !!partner;
    if (viewer?.role === "investor") {
      return isPartner ? INVESTOR_PARTNER_CONNECTION_FEE : INVESTOR_CONNECTION_FEE;
    }
    return isPartner ? STARTUP_PARTNER_CONNECTION_FEE : STARTUP_CONNECTION_FEE;
  },
});

// ── Create a pending contactUnlock record (for admin-added profiles) ──
export const initiateContactUnlock = mutation({
  args: {
    targetProfileId: v.string(),
    targetType: v.union(v.literal("startup"), v.literal("investor")),
    orderId: v.string(),
  },
  handler: async (ctx, args): Promise<{ unlockId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    const viewer = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!viewer) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    // Check if already unlocked
    const existing = await ctx.db
      .query("contactUnlocks")
      .withIndex("by_unlocker_target", (q) =>
        q.eq("unlockerUserId", viewer._id).eq("targetProfileId", args.targetProfileId)
      )
      .first();

    if (existing?.status === "active") {
      throw new ConvexError({ code: "CONFLICT", message: "Already unlocked" });
    }

    if (existing) {
      // Update existing pending record with new orderId
      await ctx.db.patch(existing._id, { orderId: args.orderId });
      return { unlockId: existing._id };
    }

    const unlockId = await ctx.db.insert("contactUnlocks", {
      unlockerUserId: viewer._id,
      targetProfileId: args.targetProfileId,
      targetType: args.targetType,
      orderId: args.orderId,
      status: "pending_payment",
    });

    return { unlockId };
  },
});

// ── Activate a contactUnlock after payment confirmed ──
export const activateContactUnlock = mutation({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    const unlock = await ctx.db
      .query("contactUnlocks")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!unlock) throw new ConvexError({ code: "NOT_FOUND", message: "Unlock record not found" });

    await ctx.db.patch(unlock._id, { status: "active" });
  },
});
