"use node";

import { v, ConvexError } from "convex/values";
import { action } from "./_generated/server";
import { api, internal } from "./_generated/api";
import { SECTOR_PACK_FEE, FULL_ACCESS_FEE } from "./premiumTiers.ts";

const CASHFREE_PROD_API = "https://api.cashfree.com/pg";
const CASHFREE_SANDBOX_API = "https://sandbox.cashfree.com/pg";
const API_VERSION = "2023-08-01";

/** Emails that receive sandbox/test mode when ENABLE_SANDBOX_TEST_USERS=true */
const SANDBOX_USERS = ["ceo@tdventures.in", "sanjeev@tdventures.in"];

/** Returns the correct Cashfree credentials and base URL for the given user email.
 *  Sandbox is ONLY enabled when ENABLE_SANDBOX_TEST_USERS=true AND email is in SANDBOX_USERS. */
function getCashfreeConfig(userEmail: string | null | undefined): {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  isSandbox: boolean;
} {
  const sandboxEnabled = (process.env.ENABLE_SANDBOX_TEST_USERS ?? "false").toLowerCase() === "true";
  const isSandboxUser = sandboxEnabled && SANDBOX_USERS.includes(userEmail ?? "");

  if (isSandboxUser) {
    return {
      baseUrl: CASHFREE_SANDBOX_API,
      clientId: process.env.CASHFREE_TEST_APP_ID ?? process.env.CASHFREE_CLIENT_ID!,
      clientSecret: process.env.CASHFREE_TEST_SECRET_KEY ?? process.env.CASHFREE_CLIENT_SECRET!,
      isSandbox: true,
    };
  }
  return {
    baseUrl: CASHFREE_PROD_API,
    clientId: process.env.CASHFREE_CLIENT_ID!,
    clientSecret: process.env.CASHFREE_CLIENT_SECRET!,
    isSandbox: false,
  };
}

async function createCashfreeOrder(
  orderId: string,
  amount: number,
  returnUrl: string,
  user: { _id: string; name?: string | null; email?: string | null }
): Promise<string> {
  const cf = getCashfreeConfig(user.email);
  console.log(`[createCashfreeOrder] sandbox=${cf.isSandbox} orderId=${orderId}`);
  const response = await fetch(`${cf.baseUrl}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-client-id": cf.clientId,
      "x-client-secret": cf.clientSecret,
      "x-api-version": API_VERSION,
    },
    body: JSON.stringify({
      order_id: orderId,
      order_amount: amount,
      order_currency: "INR",
      customer_details: {
        customer_id: user._id.toString().slice(0, 50),
        customer_name: user.name ?? "User",
        customer_email: user.email ?? "",
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: returnUrl,
        notify_url: process.env.CASHFREE_WEBHOOK_URL ?? "",
      },
    }),
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new ConvexError({
      message: `Payment gateway error (${response.status}): ${responseText.slice(0, 200)}`,
      code: "EXTERNAL_SERVICE_ERROR",
    });
  }
  const data = JSON.parse(responseText) as { payment_session_id: string };
  return data.payment_session_id;
}

// ── Create Cashfree order for Sector Pack purchase ──
export const createSectorPackPayment = action({
  args: {
    sector: v.string(),
    successUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ paymentSessionId: string; amount: number; orderId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const shortUserId = user._id.toString().slice(0, 8);
    const shortTs = Date.now().toString().slice(-8);
    // Encode sector safely for orderId (replace special chars)
    const safeSector = encodeURIComponent(args.sector).slice(0, 12);
    const orderId = `scp_${safeSector}_${shortUserId}_${shortTs}`;

    const returnUrl = `${args.successUrl}?order_id=${orderId}&tier=sector_pack&sector=${encodeURIComponent(args.sector)}`;
    const paymentSessionId = await createCashfreeOrder(orderId, SECTOR_PACK_FEE, returnUrl, user);

    // Store payment record so webhook can look up userId on activation
    await ctx.runMutation(internal.paymentRecords.createPaymentRecord, {
      userId: user._id,
      linkId: orderId,
      amount: SECTOR_PACK_FEE,
    });

    return { paymentSessionId, amount: SECTOR_PACK_FEE, orderId };
  },
});

// ── Create Cashfree order for Full Access Pass ──
export const createFullAccessPayment = action({
  args: {
    successUrl: v.string(),
  },
  handler: async (ctx, args): Promise<{ paymentSessionId: string; amount: number; orderId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const shortUserId = user._id.toString().slice(0, 8);
    const shortTs = Date.now().toString().slice(-8);
    const orderId = `fap_${shortUserId}_${shortTs}`;

    const returnUrl = `${args.successUrl}?order_id=${orderId}&tier=full_access`;
    const paymentSessionId = await createCashfreeOrder(orderId, FULL_ACCESS_FEE, returnUrl, user);

    // Store payment record so webhook can look up userId on activation
    await ctx.runMutation(internal.paymentRecords.createPaymentRecord, {
      userId: user._id,
      linkId: orderId,
      amount: FULL_ACCESS_FEE,
    });

    return { paymentSessionId, amount: FULL_ACCESS_FEE, orderId };
  },
});
