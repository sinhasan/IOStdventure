import { mutation, query, internalQuery } from "./_generated/server";
import { v, ConvexError } from "convex/values";

// Emails automatically granted their role on first sign-in
const ROLE_MAP: Record<string, "superadmin" | "admin"> = {
  "sinhasan@gmail.com": "superadmin",
  "ifundindia@gmail.com": "admin",
};

export function isAdminEmail(email: string | undefined): boolean {
  return email !== undefined && email in ROLE_MAP;
}

export function isAdminRole(role: string | undefined | null): boolean {
  return role === "superadmin" || role === "admin";
}

// Get current user with their onboarding status
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
  },
});

export const updateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new ConvexError({ code: "UNAUTHENTICATED", message: "User not logged in" });
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    const autoRole = ROLE_MAP[identity.email ?? ""];
    // Extract avatar URL from OIDC identity (picture / profileUrl fields)
    const avatarUrl = (identity.pictureUrl as string | undefined)
      ?? (identity.picture as string | undefined)
      ?? (identity.profileUrl as string | undefined)
      ?? undefined;

    if (user !== null) {
      const updates: { role?: typeof autoRole; avatar?: string } = {};
      if (autoRole && user.role !== autoRole) updates.role = autoRole;
      if (avatarUrl && user.avatar !== avatarUrl) updates.avatar = avatarUrl;
      if (Object.keys(updates).length > 0) await ctx.db.patch(user._id, updates);
      return user._id;
    }

    return await ctx.db.insert("users", {
      name: identity.name,
      email: identity.email,
      avatar: avatarUrl,
      tokenIdentifier: identity.tokenIdentifier,
      role: autoRole ?? undefined,
    });
  },
});

// Completes onboarding — role is strictly derived from invitation token, not user input
export const completeOnboarding = mutation({
  args: {
    role: v.union(v.literal("startup"), v.literal("investor")),
    invitationToken: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    // Validate the invitation token
    const invitation = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.invitationToken))
      .unique();

    if (!invitation || invitation.status !== "pending") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Invalid or expired invitation token" });
    }

    // Token must match the requested role
    if (invitation.type !== args.role) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Token role mismatch" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    // Mark invitation as accepted
    await ctx.db.patch(invitation._id, { status: "accepted" });

    await ctx.db.patch(user._id, { role: args.role });
    return user._id;
  },
});

// Self-signup: user chooses their own role (startup or investor) without an invitation token.
// Only allowed if the user has no role yet and is not an admin email.
export const selfSetRole = mutation({
  args: {
    role: v.union(v.literal("startup"), v.literal("investor"), v.literal("partner")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    // Admin emails must never self-assign a non-admin role
    if (isAdminEmail(identity.email)) {
      throw new ConvexError({ code: "FORBIDDEN", message: "Admin accounts cannot use self-signup" });
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();
    if (!user) throw new ConvexError({ code: "NOT_FOUND", message: "User not found" });

    // Only allow if no role assigned yet
    if (user.role && user.role !== args.role) {
  throw new ConvexError({
    code: "CONFLICT",
    message: "Role already assigned"
  });
}

// If already same role, just continue safely
if (user.role === args.role) {
  return user._id;
}

    await ctx.db.patch(user._id, { role: args.role });
    return user._id;
  },
});

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();
  },
});

// Superadmin only: set a user's role
export const setUserRole = mutation({
  args: {
    targetEmail: v.string(),
    role: v.union(
      v.literal("superadmin"),
      v.literal("admin"),
      v.literal("startup"),
      v.literal("investor")
    ),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ code: "UNAUTHENTICATED", message: "Not authenticated" });

    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    // Only superadmin can set roles
    if (!caller || caller.role !== "superadmin") {
      throw new ConvexError({ code: "FORBIDDEN", message: "Only superadmins can set roles" });
    }

    // Find the target user by email
    const target = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.targetEmail))
      .first();

    if (!target) {
      throw new ConvexError({ code: "NOT_FOUND", message: `No user found with email ${args.targetEmail}` });
    }

    await ctx.db.patch(target._id, { role: args.role });
    return target._id;
  },
});

// Superadmin only: list all users
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const caller = await ctx.db
      .query("users")
      .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
      .unique();

    if (!caller || caller.role !== "superadmin") return [];

    return await ctx.db.query("users").collect();
  },
});

// ── Internal: get user by ID (for email sending) ──
export const getUserById = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});
