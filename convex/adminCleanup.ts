"use node";

/**
 * Admin-only cleanup actions (Node.js runtime).
 * These are called manually by admins to fix data issues.
 *
 * IMPORTANT: These functions verify every access grant against Cashfree's API.
 * Any grant without a confirmed PAID status is revoked.
 */
import { internalAction, action } from "./_generated/server";
import { internal, api } from "./_generated/api";

const CASHFREE_PROD_API = "https://api.cashfree.com/pg";
const API_VERSION = "2023-08-01";

async function verifyCashfreeOrder(orderId: string): Promise<string> {
  try {
    const res = await fetch(`${CASHFREE_PROD_API}/orders/${orderId}`, {
      headers: {
        "x-client-id": process.env.CASHFREE_CLIENT_ID!,
        "x-client-secret": process.env.CASHFREE_CLIENT_SECRET!,
        "x-api-version": API_VERSION,
      },
    });
    if (!res.ok) return "UNKNOWN";
    const data = (await res.json()) as { order_status?: string };
    return (data.order_status ?? "UNKNOWN").toUpperCase();
  } catch {
    return "UNKNOWN";
  }
}

// ── Revoke all full access passes where Cashfree order is NOT PAID ──
export const revokeUnpaidFullAccessPasses = internalAction({
  args: {},
  handler: async (ctx): Promise<{ revoked: number; kept: number; errors: number }> => {
    const passes = await ctx.runQuery(internal.adminCleanupQueries.getAllFullAccessPasses, {});
    let revoked = 0, kept = 0, errors = 0;

    for (const pass of passes) {
      if (pass.status !== "active") { kept++; continue; }
      const status = await verifyCashfreeOrder(pass.orderId);
      if (status === "PAID") {
        kept++;
        console.log(`[cleanup] KEEP fullAccessPass orderId=${pass.orderId}`);
      } else {
        await ctx.runMutation(internal.adminCleanupMutations.revokeFullAccessPass, { passId: pass._id });
        revoked++;
        console.log(`[cleanup] REVOKE fullAccessPass orderId=${pass.orderId} cashfreeStatus=${status}`);
      }
    }

    console.log(`[cleanup] Full Access Passes: revoked=${revoked} kept=${kept} errors=${errors}`);
    return { revoked, kept, errors };
  },
});

// ── Revoke all sector packs where Cashfree order is NOT PAID ──
export const revokeUnpaidSectorPacks = internalAction({
  args: {},
  handler: async (ctx): Promise<{ revoked: number; kept: number; errors: number }> => {
    const packs = await ctx.runQuery(internal.adminCleanupQueries.getAllSectorPacks, {});
    let revoked = 0, kept = 0, errors = 0;

    for (const pack of packs) {
      if (pack.status !== "active") { kept++; continue; }
      const status = await verifyCashfreeOrder(pack.orderId);
      if (status === "PAID") {
        kept++;
        console.log(`[cleanup] KEEP sectorPack orderId=${pack.orderId}`);
      } else {
        await ctx.runMutation(internal.adminCleanupMutations.revokeSectorPack, { packId: pack._id });
        revoked++;
        console.log(`[cleanup] REVOKE sectorPack orderId=${pack.orderId} cashfreeStatus=${status}`);
      }
    }

    console.log(`[cleanup] Sector Packs: revoked=${revoked} kept=${kept} errors=${errors}`);
    return { revoked, kept, errors };
  },
});

// ── Revoke all contact unlocks where Cashfree order is NOT PAID ──
export const revokeUnpaidContactUnlocks = internalAction({
  args: {},
  handler: async (ctx): Promise<{ revoked: number; kept: number; errors: number }> => {
    const unlocks = await ctx.runQuery(internal.adminCleanupQueries.getAllActiveContactUnlocks, {});
    let revoked = 0, kept = 0, errors = 0;

    for (const unlock of unlocks) {
      const status = await verifyCashfreeOrder(unlock.orderId);
      if (status === "PAID") {
        kept++;
        console.log(`[cleanup] KEEP contactUnlock orderId=${unlock.orderId}`);
      } else {
        await ctx.runMutation(internal.adminCleanupMutations.revokeContactUnlock, { unlockId: unlock._id });
        revoked++;
        console.log(`[cleanup] REVOKE contactUnlock orderId=${unlock.orderId} cashfreeStatus=${status}`);
      }
    }

    console.log(`[cleanup] Contact Unlocks: revoked=${revoked} kept=${kept} errors=${errors}`);
    return { revoked, kept, errors };
  },
});

// ── Revoke connections activated without payment ──
export const revokeUnpaidConnections = internalAction({
  args: {},
  handler: async (ctx): Promise<{ revoked: number; kept: number }> => {
    const connections = await ctx.runQuery(internal.adminCleanupQueries.getAllActiveConnections, {});
    let revoked = 0, kept = 0;

    for (const conn of connections) {
      if (!conn.paymentLinkId) {
        await ctx.runMutation(internal.adminCleanupMutations.revokeConnection, { connectionId: conn._id });
        revoked++;
        console.log(`[cleanup] REVOKE connection (no paymentLinkId) connectionId=${conn._id}`);
        continue;
      }
      const status = await verifyCashfreeOrder(conn.paymentLinkId);
      if (status === "PAID") {
        kept++;
      } else {
        await ctx.runMutation(internal.adminCleanupMutations.revokeConnection, { connectionId: conn._id });
        revoked++;
        console.log(`[cleanup] REVOKE connection orderId=${conn.paymentLinkId} cashfreeStatus=${status}`);
      }
    }

    console.log(`[cleanup] Connections: revoked=${revoked} kept=${kept}`);
    return { revoked, kept };
  },
});

// ── Run all cleanup actions ──
export const runFullCleanup = internalAction({
  args: {},
  handler: async (ctx): Promise<{
    fullAccessPasses: { revoked: number; kept: number; errors: number };
    sectorPacks: { revoked: number; kept: number; errors: number };
    contactUnlocks: { revoked: number; kept: number; errors: number };
    connections: { revoked: number; kept: number };
  }> => {
    const [fullAccessPasses, sectorPacks, contactUnlocks, connections] = await Promise.all([
      ctx.runAction(internal.adminCleanup.revokeUnpaidFullAccessPasses, {}),
      ctx.runAction(internal.adminCleanup.revokeUnpaidSectorPacks, {}),
      ctx.runAction(internal.adminCleanup.revokeUnpaidContactUnlocks, {}),
      ctx.runAction(internal.adminCleanup.revokeUnpaidConnections, {}),
    ]);
    return { fullAccessPasses, sectorPacks, contactUnlocks, connections };
  },
});

// ── Public: admin-triggered cleanup ──
export const adminRunCleanup = action({
  args: {},
  handler: async (ctx): Promise<{
    success: boolean;
    summary: {
      fullAccessPasses: { revoked: number; kept: number; errors: number };
      sectorPacks: { revoked: number; kept: number; errors: number };
      contactUnlocks: { revoked: number; kept: number; errors: number };
      connections: { revoked: number; kept: number };
    };
  }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { success: false, summary: { fullAccessPasses: { revoked: 0, kept: 0, errors: 0 }, sectorPacks: { revoked: 0, kept: 0, errors: 0 }, contactUnlocks: { revoked: 0, kept: 0, errors: 0 }, connections: { revoked: 0, kept: 0 } } };

    const user = await ctx.runQuery(api.users.getCurrentUser);
    if (!user || (user.role !== "admin" && user.role !== "superadmin")) {
      return { success: false, summary: { fullAccessPasses: { revoked: 0, kept: 0, errors: 0 }, sectorPacks: { revoked: 0, kept: 0, errors: 0 }, contactUnlocks: { revoked: 0, kept: 0, errors: 0 }, connections: { revoked: 0, kept: 0 } } };
    }

    const summary = await ctx.runAction(internal.adminCleanup.runFullCleanup, {});
    return { success: true, summary };
  },
});
