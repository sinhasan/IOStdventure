/**
 * Read-only helpers used by adminCleanup actions.
 * These run in the V8 runtime (no "use node").
 */
import { v } from "convex/values";
import { internalQuery } from "./_generated/server";

export const getAllFullAccessPasses = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("fullAccessPasses").collect();
  },
});

export const getAllSectorPacks = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("sectorPacks").collect();
  },
});

export const getAllActiveContactUnlocks = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("contactUnlocks")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});

export const getAllActiveConnections = internalQuery({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("connections")
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();
  },
});
