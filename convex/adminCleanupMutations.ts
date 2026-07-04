/**
 * Write mutations for adminCleanup actions (V8 runtime).
 */
import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const revokeFullAccessPass = internalMutation({
  args: { passId: v.id("fullAccessPasses") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.passId, { status: "expired" });
  },
});

export const revokeSectorPack = internalMutation({
  args: { packId: v.id("sectorPacks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.packId, { status: "expired" });
  },
});

export const revokeContactUnlock = internalMutation({
  args: { unlockId: v.id("contactUnlocks") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.unlockId, { status: "pending_payment" });
  },
});

export const revokeConnection = internalMutation({
  args: { connectionId: v.id("connections") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.connectionId, { status: "pending_payment" });
  },
});
