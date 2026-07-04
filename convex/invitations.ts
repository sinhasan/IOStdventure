import { mutation, query } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { internal } from "./_generated/api";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("invitations").collect();
  },
});

export const send = mutation({
  args: {
    email: v.string(),
    type: v.union(v.literal("startup"), v.literal("investor")),
    message: v.optional(v.string()),
    senderEmail: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });

    const user = await ctx.db.query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    // Generate a simple token
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);

    const id = await ctx.db.insert("invitations", {
      email: args.email,
      type: args.type,
      status: "pending",
      token,
      invitedBy: user._id,
      message: args.message,
    });

    // Send the invitation email asynchronously
    await ctx.scheduler.runAfter(0, internal.emails.sendInvitationEmail, {
      to: args.email,
      type: args.type,
      message: args.message,
      token,
      invitedByName: user.name,
      senderEmail: args.senderEmail,
    });

    return id;
  },
});

export const updateStatus = mutation({
  args: {
    id: v.id("invitations"),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    await ctx.db.patch(args.id, { status: args.status });
  },
});

export const remove = mutation({
  args: { id: v.id("invitations") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    await ctx.db.delete(args.id);
  },
});
