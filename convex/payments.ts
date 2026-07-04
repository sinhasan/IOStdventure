"use node";

import { v, ConvexError } from "convex/values";
import { action, internalAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import type { Id } from "./_generated/dataModel.d.ts";

const CASHFREE_PROD_API = "https://api.cashfree.com/pg";
const CASHFREE_SANDBOX_API = "https://sandbox.cashfree.com/pg";
const API_VERSION = "2023-08-01";

const SANDBOX_USERS = ["ceo@tdventures.in", "sanjeev@tdventures.in"];
const ADMIN_EMAILS = ["sinhasan@gmail.com", "ifundindia@gmail.com"];

// ── Pricing (single source of truth) ──
const STARTUP_CONNECTION_FEE          = 199;
const STARTUP_PARTNER_CONNECTION_FEE  = 149;
const INVESTOR_CONNECTION_FEE         = 399;
const INVESTOR_PARTNER_CONNECTION_FEE = 299;

// All valid reveal/connection amounts — used in amount guard
const VALID_CONNECTION_AMOUNTS = [
  STARTUP_CONNECTION_FEE,
  STARTUP_PARTNER_CONNECTION_FEE,
  INVESTOR_CONNECTION_FEE,
  INVESTOR_PARTNER_CONNECTION_FEE,
];

function resolveConnectionFee(
  role: string | undefined | null,
  isPartner: boolean
): number {
  if (role === "startup")  return isPartner ? STARTUP_PARTNER_CONNECTION_FEE  : STARTUP_CONNECTION_FEE;
  if (role === "investor") return isPartner ? INVESTOR_PARTNER_CONNECTION_FEE : INVESTOR_CONNECTION_FEE;
  return STARTUP_CONNECTION_FEE; // safe fallback
}

function getCashfreeConfig(userEmail: string | null | undefined): {
  baseUrl: string; clientId: string; clientSecret: string; isSandbox: boolean;
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

function isAdminRole(role: string | undefined | null): boolean {
  return role === "superadmin" || role === "admin";
}

const FEES: Record<string, number> = { startup: 12500, investor: 37500, admin: 0 };

function getFeeForRole(role: string | undefined | null): number {
  return FEES[role ?? ""] ?? 12500;
}

// ── Public: get current user's payment status ──
export const getMyPaymentStatus = action({
  args: {},
  handler: async (ctx): Promise<{ hasPaid: boolean; fee: number; role: string | null }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { hasPaid: false, fee: 0, role: null };
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) return { hasPaid: false, fee: 0, role: null };
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (isAdmin) return { hasPaid: true, fee: 0, role: "admin" };
    const fee = getFeeForRole(user.role);
    const { hasPaid } = await ctx.runQuery(internal.paymentRecords.getPaymentStatus, { userId: user._id });
    return { hasPaid, fee, role: user.role ?? null };
  },
});

// ── Public: create Cashfree Order for matching access ──
export const createMatchingPaymentLink = action({
  args: { successUrl: v.string() },
  handler: async (ctx, args): Promise<{ paymentSessionId: string; amount: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (isAdmin || !user.role) {
      throw new ConvexError({ message: "Only startups and investors can purchase matching access", code: "FORBIDDEN" });
    }
    const amount = getFeeForRole(user.role);
    const shortUserId = user._id.toString().slice(0, 8);
    const shortTimestamp = Date.now().toString().slice(-8);
    const orderId = `pay_${shortUserId}_${shortTimestamp}`;
    const cf = getCashfreeConfig(user.email);
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
          return_url: `${args.successUrl}?order_id=${orderId}`,
          notify_url: process.env.CASHFREE_WEBHOOK_URL ?? "",
        },
      }),
    });
    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Cashfree Orders API error ${response.status}:`, responseText);
      throw new ConvexError({ message: `Payment gateway error (${response.status}): ${responseText.slice(0, 200)}`, code: "EXTERNAL_SERVICE_ERROR" });
    }
    let data: { order_id: string; payment_session_id: string };
    try {
      data = JSON.parse(responseText) as { order_id: string; payment_session_id: string };
    } catch {
      throw new ConvexError({ message: `Invalid response from Cashfree: ${responseText.slice(0, 200)}`, code: "EXTERNAL_SERVICE_ERROR" });
    }
    await ctx.runMutation(internal.paymentRecords.createPaymentRecord, { userId: user._id, linkId: data.order_id, amount });
    return { paymentSessionId: data.payment_session_id, amount };
  },
});

// ── Internal: verify order payment status from Cashfree ──
export const verifyAndActivatePayment = internalAction({
  args: { linkId: v.string() },
  handler: async (ctx, args): Promise<boolean> => {
    const response = await fetch(`${CASHFREE_PROD_API}/orders/${args.linkId}`, {
      headers: {
        "x-client-id": process.env.CASHFREE_CLIENT_ID!,
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET!,
        "x-api-version": API_VERSION,
      },
    });
    if (!response.ok) { console.error(`Cashfree verify order error ${response.status}`); return false; }
    const data = (await response.json()) as { order_status?: string };
    console.log("Cashfree order status response:", JSON.stringify(data));
    const status = (data.order_status ?? "").toUpperCase();
    if (status === "PAID") {
      await ctx.runMutation(internal.paymentRecords.markPaymentPaid, { linkId: args.linkId });
      return true;
    }
    return false;
  },
});

// ── Public: verify a single order's payment status from Cashfree ──
export const verifyOrderStatus = action({
  args: { orderId: v.string(), userEmail: v.optional(v.string()) },
  handler: async (_ctx, args): Promise<{ status: string }> => {
    try {
      const cf = getCashfreeConfig(args.userEmail);
      const response = await fetch(`${cf.baseUrl}/orders/${args.orderId}`, {
        headers: { "x-client-id": cf.clientId, "x-client-secret": cf.clientSecret, "x-api-version": API_VERSION },
      });
      if (!response.ok) { console.error(`Cashfree verify order error ${response.status}`); return { status: "UNKNOWN" }; }
      const data = (await response.json()) as { order_status?: string };
      const raw = (data.order_status ?? "UNKNOWN").toUpperCase();
      if (raw === "PAID") return { status: "PAID" };
      if (raw === "FAILED" || raw === "USER_DROPPED") return { status: "FAILED" };
      if (raw === "CANCELLED" || raw === "TERMINATED") return { status: "CANCELLED" };
      if (raw === "ACTIVE" || raw === "PENDING") return { status: "PENDING" };
      return { status: raw };
    } catch (err) {
      console.error("verifyOrderStatus error:", err);
      return { status: "UNKNOWN" };
    }
  },
});

// ── Public: poll and verify payment after returning from Cashfree ──
export const checkAndActivatePayment = action({
  args: {},
  handler: async (ctx): Promise<{ hasPaid: boolean }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { hasPaid: false };
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) return { hasPaid: false };
    if (user.role === "admin") return { hasPaid: true };
    const isAdmin2 = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (isAdmin2) return { hasPaid: true };
    const { hasPaid } = await ctx.runQuery(internal.paymentRecords.getPaymentStatus, { userId: user._id });
    if (hasPaid) return { hasPaid: true };
    const pendingPayments = await ctx.runQuery(internal.paymentRecords.getPendingPayments, { userId: user._id });
    for (const payment of pendingPayments) {
      const paid = await ctx.runAction(internal.payments.verifyAndActivatePayment, { linkId: payment.linkId });
      if (paid) return { hasPaid: true };
    }
    return { hasPaid: false };
  },
});

// ── Public: create Cashfree order for a connection payment ──
// Startup: ₹199 direct, ₹149 partner | Investor: ₹399 direct, ₹299 partner
export const createConnectionPayment = action({
  args: {
    connectionId: v.string(),
    successUrl: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ paymentSessionId: string; amount: number; orderId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const partnerProfile = await ctx.runQuery(api.partners.getMyPartnerProfile);
    const amount = resolveConnectionFee(user.role, !!partnerProfile);

    const shortUserId = user._id.toString().slice(0, 8);
    const shortTimestamp = Date.now().toString().slice(-8);
    const orderId = `con_${shortUserId}_${shortTimestamp}`;

    const cf = getCashfreeConfig(user.email);
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
          return_url: `${args.successUrl}?order_id=${orderId}&connection_id=${args.connectionId}${args.sessionId ? `&ref_session=${args.sessionId}` : ""}`,
          notify_url: process.env.CASHFREE_WEBHOOK_URL ?? "",
        },
      }),
    });
    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Cashfree connection order error ${response.status}:`, responseText);
      throw new ConvexError({ message: `Payment gateway error (${response.status}): ${responseText.slice(0, 200)}`, code: "EXTERNAL_SERVICE_ERROR" });
    }
    const data = JSON.parse(responseText) as { order_id: string; payment_session_id: string };
    await ctx.runMutation(internal.paymentRecords.createPaymentRecord, { userId: user._id, linkId: data.order_id, amount });
    return { paymentSessionId: data.payment_session_id, amount, orderId: data.order_id };
  },
});

// ── Internal: activate a connection after payment webhook confirms ──
export const activateConnectionByOrderId = action({
  args: { orderId: v.string() },
  handler: async (_ctx, args): Promise<void> => {
    console.log("Connection order paid:", args.orderId);
  },
});

// ─────────────────────────────────────────────────────────────────────────────
// BULLETPROOF: verify payment directly with Cashfree then activate correct tier.
// Amount guard prevents cheap orders unlocking higher-value passes.
// ─────────────────────────────────────────────────────────────────────────────
export const verifyAndActivateTier = action({
  args: {
    orderId: v.string(),
    tier: v.optional(v.string()),
    connectionId: v.optional(v.string()),
    unlockProfile: v.optional(v.string()),
    unlockType: v.optional(v.union(v.literal("startup"), v.literal("investor"))),
  },
  handler: async (ctx, args): Promise<{ activated: boolean; status: string; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { activated: false, status: "UNAUTHENTICATED", message: "Not authenticated" };
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) return { activated: false, status: "USER_NOT_FOUND", message: "User not found" };

    // ── 1. Verify with Cashfree ──
    let orderStatus = "UNKNOWN";
    let orderAmount = 0;
    try {
      const cf = getCashfreeConfig(user.email);
      console.log(`[verifyAndActivateTier] sandbox=${cf.isSandbox} orderId=${args.orderId}`);
      const res = await fetch(`${cf.baseUrl}/orders/${args.orderId}`, {
        headers: { "x-client-id": cf.clientId, "x-client-secret": cf.clientSecret, "x-api-version": API_VERSION },
      });
      if (res.ok) {
        const data = (await res.json()) as { order_status?: string; order_amount?: number };
        orderStatus = (data.order_status ?? "UNKNOWN").toUpperCase();
        orderAmount = Number(data.order_amount ?? 0);
        console.log(`[verifyAndActivateTier] orderId=${args.orderId} status=${orderStatus} amount=${orderAmount}`);
      } else {
        console.error(`[verifyAndActivateTier] Cashfree HTTP ${res.status}`);
        return { activated: false, status: "VERIFY_FAILED", message: "Could not verify payment with gateway" };
      }
    } catch (err) {
      console.error("[verifyAndActivateTier] fetch error:", err);
      return { activated: false, status: "VERIFY_FAILED", message: "Payment verification failed" };
    }

    // ── 2. Only proceed if PAID ──
    if (orderStatus !== "PAID") {
      const normalizeMap: Record<string, string> = {
        ACTIVE: "PENDING", PENDING: "PENDING",
        USER_DROPPED: "CANCELLED", TERMINATED: "CANCELLED", CANCELLED: "CANCELLED",
        FAILED: "FAILED",
      };
      return { activated: false, status: normalizeMap[orderStatus] ?? orderStatus, message: "Payment not completed" };
    }

    // ── 3. Activate with amount guard ──
    try {
      if (args.tier === "full_access") {
        if (orderAmount !== 59999) {
          console.error(`[verifyAndActivateTier] wrong amount for full_access: ${orderAmount}`);
          return { activated: false, status: "AMOUNT_MISMATCH", message: "Invalid payment amount" };
        }
        await ctx.runMutation(internal.premiumTiers.activateFullAccessInternal, { orderId: args.orderId, userId: user._id });
        return { activated: true, status: "PAID", message: "Full Access activated!" };

      } else if (args.tier === "sector_pack") {
        if (orderAmount !== 11999) {
          console.error(`[verifyAndActivateTier] wrong amount for sector_pack: ${orderAmount}`);
          return { activated: false, status: "AMOUNT_MISMATCH", message: "Invalid payment amount" };
        }
        await ctx.runMutation(internal.premiumTiers.activateSectorPackInternal, { orderId: args.orderId, userId: user._id });
        return { activated: true, status: "PAID", message: "Sector Pack activated!" };

      } else if (args.unlockProfile && args.unlockType) {
        if (!VALID_CONNECTION_AMOUNTS.includes(orderAmount)) {
          console.error(`[verifyAndActivateTier] wrong amount for contact unlock: ${orderAmount}`);
          return { activated: false, status: "AMOUNT_MISMATCH", message: "Invalid payment amount" };
        }
        await ctx.runMutation(api.connections.activateContactUnlock, { orderId: args.orderId });
        return { activated: true, status: "PAID", message: "Contact unlocked!" };

      } else if (args.connectionId) {
        if (!VALID_CONNECTION_AMOUNTS.includes(orderAmount)) {
          console.error(`[verifyAndActivateTier] wrong amount for connection: ${orderAmount}`);
          return { activated: false, status: "AMOUNT_MISMATCH", message: "Invalid payment amount" };
        }
        await ctx.runMutation(api.connections.activateConnection, {
          connectionId: args.connectionId as Id<"connections">,
          paymentLinkId: args.orderId,
        });
        return { activated: true, status: "PAID", message: "Connection activated!" };

      } else {
        return { activated: false, status: "UNKNOWN_TIER", message: "Unknown tier type" };
      }
    } catch (err) {
      console.error("[verifyAndActivateTier] activation error:", err);
      return { activated: false, status: "ACTIVATION_FAILED", message: "Payment received but activation failed. Contact support." };
    }
  },
});

// ── Public: create Cashfree order for unlocking an admin-added profile ──
// Startup: ₹199 direct, ₹149 partner | Investor: ₹399 direct, ₹299 partner
export const createContactUnlockPayment = action({
  args: {
    targetProfileId: v.string(),
    targetType: v.union(v.literal("startup"), v.literal("investor")),
    successUrl: v.string(),
    sessionId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ paymentSessionId: string; amount: number; orderId: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const partnerProfile = await ctx.runQuery(api.partners.getMyPartnerProfile);
    const amount = resolveConnectionFee(user.role, !!partnerProfile);

    const shortUserId = user._id.toString().slice(0, 8);
    const shortTimestamp = Date.now().toString().slice(-8);
    const orderId = `unl_${shortUserId}_${shortTimestamp}`;

    const cf = getCashfreeConfig(user.email);
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
          return_url: `${args.successUrl}?order_id=${orderId}&unlock_profile=${args.targetProfileId}&unlock_type=${args.targetType}${args.sessionId ? `&ref_session=${args.sessionId}` : ""}`,
          notify_url: process.env.CASHFREE_WEBHOOK_URL ?? "",
        },
      }),
    });
    const responseText = await response.text();
    if (!response.ok) {
      console.error(`Cashfree unlock order error ${response.status}:`, responseText);
      throw new ConvexError({ message: `Payment gateway error (${response.status}): ${responseText.slice(0, 200)}`, code: "EXTERNAL_SERVICE_ERROR" });
    }
    const data = JSON.parse(responseText) as { order_id: string; payment_session_id: string };
    await ctx.runMutation(internal.paymentRecords.createPaymentRecord, { userId: user._id, linkId: data.order_id, amount });
    await ctx.runMutation(api.connections.initiateContactUnlock, {
      targetProfileId: args.targetProfileId,
      targetType: args.targetType,
      orderId: data.order_id,
    });
    return { paymentSessionId: data.payment_session_id, amount, orderId: data.order_id };
  },
});
