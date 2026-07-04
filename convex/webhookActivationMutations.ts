/**
 * Webhook activation mutations (V8 runtime).
 * Called from webhookActivations.ts actions after payment verification.
 * All mutations are idempotent — safe to call multiple times.
 */
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";
import type { Id } from "./_generated/dataModel.d.ts";

const SIX_MONTHS_MS = 6 * 30 * 24 * 60 * 60 * 1000;

function sixMonthsFromNow(): string {
  return new Date(Date.now() + SIX_MONTHS_MS).toISOString();
}

const SINGLE_CONNECT_FEE = 599;

// ── Insert Full Access Pass (idempotent) ──
export const insertFullAccessPass = internalMutation({
  args: { orderId: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("fullAccessPasses")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (existing) return; // Idempotent
    await ctx.db.insert("fullAccessPasses", {
      userId: args.userId,
      orderId: args.orderId,
      expiresAt: sixMonthsFromNow(),
      status: "active",
    });
  },
});

// ── Insert Sector Pack (idempotent) ──
export const insertSectorPack = internalMutation({
  args: { orderId: v.string(), userId: v.id("users") },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("sectorPacks")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .unique();
    if (existing) return; // Idempotent

    // orderId format: scp_<safeSector>_<userId8>_<ts8>
    const parts = args.orderId.split("_");
    const sector = decodeURIComponent(parts[1] ?? "");

    await ctx.db.insert("sectorPacks", {
      userId: args.userId,
      sector,
      orderId: args.orderId,
      expiresAt: sixMonthsFromNow(),
      status: "active",
    });
  },
});

// ── Activate Contact Unlock (idempotent) ──
export const activateContactUnlockFromWebhook = internalMutation({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const unlock = await ctx.db
      .query("contactUnlocks")
      .withIndex("by_orderId", (q) => q.eq("orderId", args.orderId))
      .first();

    if (!unlock) {
      console.error(`[webhook] No contactUnlock record for orderId=${args.orderId}`);
      return;
    }
    if (unlock.status === "active") return; // Idempotent

    // Verify amount from payment record
    const payment = await ctx.db
      .query("matchingPayments")
      .withIndex("by_linkId", (q) => q.eq("linkId", args.orderId))
      .unique();
    if (payment && payment.amount !== SINGLE_CONNECT_FEE) {
      console.error(`[webhook] Contact unlock amount mismatch: expected ${SINGLE_CONNECT_FEE}, got ${payment.amount} for orderId=${args.orderId}`);
      return;
    }

    await ctx.db.patch(unlock._id, { status: "active" });
    console.log(`[webhook] ContactUnlock activated for orderId=${args.orderId}`);
  },
});

// ── Activate Connection from webhook (idempotent) ──
export const activateConnectionFromWebhook = internalMutation({
  args: { orderId: v.string() },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("matchingPayments")
      .withIndex("by_linkId", (q) => q.eq("linkId", args.orderId))
      .unique();

    if (!payment) {
      console.error(`[webhook] No payment record for connection orderId=${args.orderId}`);
      return;
    }

    if (payment.amount !== SINGLE_CONNECT_FEE) {
      console.error(`[webhook] Connection amount mismatch: expected ${SINGLE_CONNECT_FEE}, got ${payment.amount} for orderId=${args.orderId}`);
      return;
    }

    const userId = payment.userId as Id<"users">;

    let pendingConn = await ctx.db
      .query("connections")
      .withIndex("by_investor", (q) => q.eq("investorUserId", userId))
      .filter((q) => q.eq(q.field("status"), "pending_payment"))
      .first();

    if (!pendingConn) {
      pendingConn = await ctx.db
        .query("connections")
        .withIndex("by_startup", (q) => q.eq("startupUserId", userId))
        .filter((q) => q.eq(q.field("status"), "pending_payment"))
        .first();
    }

    if (!pendingConn) {
      console.error(`[webhook] No pending connection found for userId=${userId} orderId=${args.orderId}`);
      return;
    }

    if (pendingConn.status === "active") return; // Idempotent

    await ctx.db.patch(pendingConn._id, {
      status: "active",
      paymentLinkId: args.orderId,
    });
    console.log(`[webhook] Connection activated for orderId=${args.orderId} connectionId=${pendingConn._id}`);
  },
});
