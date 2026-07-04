import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";

// ── Internal: store payment record ──
export const createPaymentRecord = internalMutation({
  args: {
    userId: v.id("users"),
    linkId: v.string(),
    amount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("matchingPayments", {
      userId: args.userId,
      linkId: args.linkId,
      status: "pending",
      amount: args.amount,
    });
  },
});

// ── Internal: mark payment as paid ──
export const markPaymentPaid = internalMutation({
  args: { linkId: v.string() },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("matchingPayments")
      .withIndex("by_linkId", (q) => q.eq("linkId", args.linkId))
      .unique();
    if (payment) {
      await ctx.db.patch(payment._id, { status: "paid" });
    }
  },
});

// ── Internal: check if user has paid ──
export const getPaymentStatus = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const paid = await ctx.db
      .query("matchingPayments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "paid"))
      .first();
    return { hasPaid: !!paid };
  },
});

// ── Internal: get pending payments for a user ──
export const getPendingPayments = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("matchingPayments")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect();
  },
});

// ── Internal: get payment record by linkId (orderId) ──
export const getPaymentRecordByLinkId = internalQuery({
  args: { linkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("matchingPayments")
      .withIndex("by_linkId", (q) => q.eq("linkId", args.linkId))
      .unique();
  },
});

// ── Internal: get user email by userId ──
export const getUserEmailByUserId = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.email ?? null;
  },
});
