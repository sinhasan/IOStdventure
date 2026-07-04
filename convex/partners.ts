import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { ConvexError } from "convex/values";
import type { GenericMutationCtx } from "convex/server";
import type { DataModel, Id } from "./_generated/dataModel";

type MutationCtx = GenericMutationCtx<DataModel>;

const ADMIN_EMAILS = ["sinhasan@gmail.com", "ifundindia@gmail.com"];

// ─── shared helper ───────────────────────────────────────────────────────────

async function getOrCreatePartner(
  ctx: MutationCtx,
  userId: Id<"users">,
  fallbackName: string,
  fallbackEmail: string,
) {
  const existing = await ctx.db
    .query("partners")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;

  const partnerId = await ctx.db.insert("partners", {
    userId,
    name: fallbackName,
    email: fallbackEmail,
    role: undefined,
  });
  return await ctx.db.get(partnerId);
}

// ─── queries ─────────────────────────────────────────────────────────────────

export const getMyPartnerProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return null;

    return await ctx.db
      .query("partners")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
  },
});

export const getMyReferrals = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) return [];

    const partner = await ctx.db
      .query("partners")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .unique();
    if (!partner) return [];

    return await ctx.db
      .query("partnerReferrals")
      .withIndex("by_partnerId", (q) => q.eq("partnerId", partner._id))
      .order("desc")
      .collect();
  },
});

export const adminListPartners = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (!ADMIN_EMAILS.includes(identity.email ?? "")) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    return await ctx.db.query("partners").collect();
  },
});

export const adminListReferrals = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (!ADMIN_EMAILS.includes(identity.email ?? "")) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    return await ctx.db.query("partnerReferrals").order("desc").collect();
  },
});

// ─── mutations ────────────────────────────────────────────────────────────────

export const ensurePartnerExists = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    await getOrCreatePartner(
      ctx,
      user._id,
      identity.name ?? user.name ?? "Partner",
      identity.email ?? user.email ?? "",
    );
  },
});

export const updatePartnerProfile = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const partner = await getOrCreatePartner(
      ctx,
      user._id,
      args.name,
      args.email,
    );
    if (!partner) throw new ConvexError({ message: "Partner not found", code: "NOT_FOUND" });

    await ctx.db.patch(partner._id, {
      name: args.name,
      email: args.email,
      role: args.role,
    });
  },
});

export const submitReferral = mutation({
  args: {
    type: v.union(v.literal("startup"), v.literal("investor")),
    referredName: v.string(),
    referredEmail: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const partner = await getOrCreatePartner(
      ctx,
      user._id,
      identity.name ?? user.name ?? "Partner",
      identity.email ?? user.email ?? "",
    );
    if (!partner) throw new ConvexError({ message: "Partner not found", code: "NOT_FOUND" });

    await ctx.db.insert("partnerReferrals", {
      partnerId: partner._id,
      type: args.type,
      referredName: args.referredName,
      referredEmail: args.referredEmail,
      notes: args.notes,
      status: "pending",
    });
  },
});

export const adminMarkReferralPaid = mutation({
  args: {
    referralId: v.id("partnerReferrals"),
    paymentAmount: v.number(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (!ADMIN_EMAILS.includes(identity.email ?? "")) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    const commissionAmount = Math.round(args.paymentAmount * 0.2 * 100) / 100;
    await ctx.db.patch(args.referralId, {
      status: "paid",
      paymentAmount: args.paymentAmount,
      commissionAmount,
    });
  },
});

export const adminUpdateReferralStatus = mutation({
  args: {
    referralId: v.id("partnerReferrals"),
    status: v.union(v.literal("pending"), v.literal("signed_up"), v.literal("paid")),
    paymentAmount: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    if (!ADMIN_EMAILS.includes(identity.email ?? "")) {
      throw new ConvexError({ message: "Forbidden", code: "FORBIDDEN" });
    }
    const patch: {
      status: "pending" | "signed_up" | "paid";
      paymentAmount?: number;
      commissionAmount?: number;
    } = { status: args.status };
    if (args.status === "paid" && args.paymentAmount !== undefined) {
      patch.paymentAmount = args.paymentAmount;
      patch.commissionAmount = Math.round(args.paymentAmount * 0.2 * 100) / 100;
    }
    await ctx.db.patch(args.referralId, patch);
  },
});

// Internal: called by webhook/payment system to auto-mark a referral paid
export const internalMarkReferralPaidByEmail = internalMutation({
  args: {
    referredEmail: v.string(),
    paymentAmount: v.number(),
  },
  handler: async (ctx, args) => {
    // Match pending or signed_up referrals for this email
    const referral = await ctx.db
      .query("partnerReferrals")
      .withIndex("by_referredEmail", (q) => q.eq("referredEmail", args.referredEmail))
      .filter((q) =>
        q.or(
          q.eq(q.field("status"), "signed_up"),
          q.eq(q.field("status"), "pending")
        )
      )
      .first();
    if (!referral) return;

    const commissionAmount = Math.round(args.paymentAmount * 0.2 * 100) / 100;
    await ctx.db.patch(referral._id, {
      status: "paid",
      paymentAmount: args.paymentAmount,
      commissionAmount,
    });
    console.log(
      `Partner commission credited: referral=${referral._id} email=${args.referredEmail} amount=₹${args.paymentAmount} commission=₹${commissionAmount}`
    );
  },
});
