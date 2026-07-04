"use node";

/**
 * Webhook activation actions (Node.js runtime).
 * Called from http.ts webhook handler after Cashfree confirms PAYMENT_SUCCESS.
 *
 * SECURITY: These functions are internal only and verify payment amounts.
 * Access is NEVER granted without a confirmed PAYMENT_SUCCESS webhook.
 */
import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const SECTOR_PACK_FEE = 11999;
const FULL_ACCESS_FEE = 59999;
const SINGLE_CONNECT_FEE = 599;

// ── Activate Full Access Pass from webhook ──
export const activateFullAccessFromWebhook = internalAction({
  args: { orderId: v.string(), orderAmount: v.number() },
  handler: async (ctx, args): Promise<void> => {
    if (args.orderAmount !== FULL_ACCESS_FEE) {
      console.error(`[webhook] Full Access amount mismatch: expected ${FULL_ACCESS_FEE}, got ${args.orderAmount} for orderId=${args.orderId}`);
      return;
    }
    const payment = await ctx.runQuery(internal.paymentRecords.getPaymentRecordByLinkId, { linkId: args.orderId });
    if (!payment) {
      console.error(`[webhook] No payment record for orderId=${args.orderId}`);
      return;
    }
    await ctx.runMutation(internal.webhookActivationMutations.insertFullAccessPass, {
      orderId: args.orderId,
      userId: payment.userId,
    });
    console.log(`[webhook] Full Access activated for userId=${payment.userId} orderId=${args.orderId}`);
  },
});

// ── Activate Sector Pack from webhook ──
export const activateSectorPackFromWebhook = internalAction({
  args: { orderId: v.string(), orderAmount: v.number() },
  handler: async (ctx, args): Promise<void> => {
    if (args.orderAmount !== SECTOR_PACK_FEE) {
      console.error(`[webhook] Sector Pack amount mismatch: expected ${SECTOR_PACK_FEE}, got ${args.orderAmount} for orderId=${args.orderId}`);
      return;
    }
    const payment = await ctx.runQuery(internal.paymentRecords.getPaymentRecordByLinkId, { linkId: args.orderId });
    if (!payment) {
      console.error(`[webhook] No payment record for orderId=${args.orderId}`);
      return;
    }
    await ctx.runMutation(internal.webhookActivationMutations.insertSectorPack, {
      orderId: args.orderId,
      userId: payment.userId,
    });
    console.log(`[webhook] Sector Pack activated for userId=${payment.userId} orderId=${args.orderId}`);
  },
});
