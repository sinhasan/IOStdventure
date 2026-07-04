import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import type { Doc } from "./_generated/dataModel.d.ts";

const ADMIN_EMAILS = ["sinhasan@gmail.com", "ifundindia@gmail.com"];

function isAdminRole(role: string | undefined | null): boolean {
  return role === "superadmin" || role === "admin";
}

// Compute profile completion percentage (0–100)
export function computeCompletion(profile: Doc<"userProfiles"> | null): number {
  if (!profile) return 0;

  let score = 0;

  if (profile.step1Complete) score += 33;
  if (profile.step2Complete) score += 34;
  if (profile.step3Complete) score += 33;

  return score;
}

// Get current user's profile
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    return profile ?? null;
  },
});

// Save step 1 — Basic Info
export const saveStep1 = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    bio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    linkedInUrl: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const step1Complete = !!(args.firstName && args.lastName);

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        step1Complete,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        ...args,
        step1Complete,
      });
    }
  },
});

// Save step 2 — Role-specific details
export const saveStep2 = mutation({
  args: {
    // Startup fields
    startupName: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    industry: v.optional(v.string()),
    startupStage: v.optional(v.string()),
    oneLinerPitch: v.optional(v.string()),
    website: v.optional(v.string()),
    teamSize: v.optional(v.number()),

    // Investor + Partner fields
    firmName: v.optional(v.string()),
    investorType: v.optional(v.string()),
    minTicket: v.optional(v.number()),
    maxTicket: v.optional(v.number()),
    preferredStages: v.optional(v.array(v.string())),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const role = user.role;

    // IMPORTANT FIX:
    // Partner users should behave like investors
    const step2Complete =
      role === "startup"
        ? !!(
            args.startupName &&
            args.industry &&
            args.startupStage
          )
        : role === "investor" || role === "partner"
        ? !!(
            args.firmName &&
            args.investorType
          )
        : true;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        step2Complete,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        ...args,
        step2Complete,
      });
    }
  },
});

// Save step 3 — Sectors & Funding
export const saveStep3 = mutation({
  args: {
    // Startup fields
    sectors: v.optional(v.array(v.string())),
    sectorsOther: v.optional(v.string()),
    fundingRaised: v.optional(v.number()),
    amountSeeking: v.optional(v.number()),
    linkedInUrl: v.optional(v.string()),

    // Investor + Partner fields
    portfolioCompanies: v.optional(v.string()),
    preferredSectors: v.optional(v.array(v.string())),
    preferredSectorsOther: v.optional(v.string()),
  },

  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new ConvexError({
        code: "UNAUTHENTICATED",
        message: "Not authenticated",
      });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (!user) {
      throw new ConvexError({
        code: "NOT_FOUND",
        message: "User not found",
      });
    }

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .first();

    const role = user.role;

    // IMPORTANT FIX:
    // Partner users should behave like investors
    const step3Complete =
      role === "startup"
        ? !!(
            args.sectors &&
            args.sectors.length > 0
          )
        : role === "investor" || role === "partner"
        ? !!(
            args.preferredSectors &&
            args.preferredSectors.length > 0
          )
        : true;

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        step3Complete,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId: user._id,
        ...args,
        step3Complete,
      });
    }
  },
});

// Admin: list all profiles with user data
export const listAllProfiles = query({
  args: {},

  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return [];

    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();

    if (
      !caller ||
      (!isAdminRole(caller.role) &&
        !ADMIN_EMAILS.includes(caller.email ?? ""))
    ) {
      return [];
    }

    const profiles = await ctx.db.query("userProfiles").collect();

    return await Promise.all(
      profiles.map(async (p) => {
        const user = await ctx.db.get(p.userId);

        return {
          ...p,
          user,
        };
      })
    );
  },
});