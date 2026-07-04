import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel.d.ts";

const ADMIN_EMAILS = ["sinhasan@gmail.com", "ifundindia@gmail.com"];

function isAdminRole(role: string | undefined | null): boolean {
  return role === "superadmin" || role === "admin";
}

// Strip sensitive contact fields from investor records for non-admins
function maskInvestor(investor: Doc<"investors">) {
  return {
    ...investor,
    email: "••••••••@••••••",
    website: investor.website ? "Hidden until introduction" : undefined,
  };
}

// Admin paginated list — server-side pagination, optional JS search filter
export const adminListPaginated = query({
  args: { paginationOpts: paginationOptsValidator, search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const empty = { page: [] as Doc<"investors">[], isDone: true, continueCursor: "" };
    if (!identity) return empty;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return empty;
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) return empty;

    const result = await ctx.db.query("investors").order("desc").paginate(args.paginationOpts);

    if (args.search && args.search.trim() !== "") {
      const q = args.search.toLowerCase();
      return {
        ...result,
        page: result.page.filter(
          (i) => i.name.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)
        ),
      };
    }
    return result;
  },
});

// Admin total count (separate query so list pages skip the full scan)
export const adminCount = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { total: 0 };
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return { total: 0 };
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) return { total: 0 };
    try {
      const all = await ctx.db.query("investors").collect();
      return { total: all.length };
    } catch {
      return { total: 0 };
    }
  },
});

// List investors — admins see everything, startups see masked data, investors see all
export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return [];

    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");

    // Startups cannot access investor list at all
    if (user.role === "startup") return [];

    let investors;
    if (args.status) {
      investors = await ctx.db.query("investors").withIndex("by_status", (idx) => idx.eq("status", args.status!)).collect();
    } else {
      investors = await ctx.db.query("investors").collect();
    }

    // Admins see everything; investors see all (their own data)
    if (isAdmin || user.role === "investor") return investors;

    // Everyone else gets masked data
    return investors.map(maskInvestor);
  },
});

export const get = query({
  args: { id: v.id("investors") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;

    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    const investor = await ctx.db.get(args.id);
    if (!investor) return null;

    // Startups cannot fetch investor details
    if (user.role === "startup") return null;

    return isAdmin || user.role === "investor" ? investor : maskInvestor(investor);
  },
});

// Get the investor profile owned by the current user
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    return await ctx.db.query("investors").withIndex("by_userId", (q) => q.eq("userId", user._id)).first();
  },
});

// Count how many matches exist for the current user's investor profile
export const getMyMatchCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return 0;
    const investor = await ctx.db.query("investors").withIndex("by_userId", (q) => q.eq("userId", user._id)).first();
    if (!investor) return 0;
    const matches = await ctx.db.query("matches").withIndex("by_investor", (q) => q.eq("investorId", investor._id)).collect();
    return matches.length;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    description: v.string(),
    type: v.union(
      v.literal("angel"),
      v.literal("vc"),
      v.literal("corporate"),
      v.literal("family-office")
    ),
    location: v.string(),
    website: v.optional(v.string()),
    linkedInUrl: v.optional(v.string()),
    firmName: v.optional(v.string()),
    title: v.optional(v.string()),
    minInvestment: v.number(),
    maxInvestment: v.number(),
    preferredStages: v.array(v.string()),
    preferredIndustries: v.array(v.string()),
    portfolioCount: v.number(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    // Only admins or investors can create investor profiles
    if (!isAdmin && user.role !== "investor") {
      throw new ConvexError({ message: "Not authorized to create investor profiles", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("investors", { ...args, status: "active" });
  },
});

export const update = mutation({
  args: {
    id: v.id("investors"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    description: v.optional(v.string()),
    type: v.optional(v.union(
      v.literal("angel"),
      v.literal("vc"),
      v.literal("corporate"),
      v.literal("family-office")
    )),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    minInvestment: v.optional(v.number()),
    maxInvestment: v.optional(v.number()),
    preferredStages: v.optional(v.array(v.string())),
    preferredIndustries: v.optional(v.array(v.string())),
    portfolioCount: v.optional(v.number()),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");

    // Only admins or the owning investor can update
    if (!isAdmin) {
      const investor = await ctx.db.get(args.id);
      if (!investor || investor.userId !== user._id) {
        throw new ConvexError({ message: "Not authorized to edit this investor profile", code: "FORBIDDEN" });
      }
    }

    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

// ── Internal mutation that inserts a single chunk of investor rows ──
export const bulkImportChunk = internalMutation({
  args: {
    rows: v.array(v.object({
      name: v.string(),
      email: v.string(),
      description: v.string(),
      firmName: v.optional(v.string()),
      title: v.optional(v.string()),
      location: v.string(),
      website: v.optional(v.string()),
      linkedInUrl: v.optional(v.string()),
      preferredIndustries: v.array(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    for (const rec of args.rows) {
      await ctx.db.insert("investors", {
        name: rec.name,
        email: rec.email,
        description: rec.description || "",
        firmName: rec.firmName,
        title: rec.title,
        type: "vc" as const,
        location: rec.location || "",
        website: rec.website,
        linkedInUrl: rec.linkedInUrl,
        minInvestment: 0,
        maxInvestment: 0,
        preferredStages: [],
        preferredIndustries: rec.preferredIndustries,
        portfolioCount: 0,
        status: "active" as const,
      });
    }
  },
});

// ── Bulk import investors from CSV/Excel ──
export const bulkImport = mutation({
  args: {
    records: v.array(v.object({
      name: v.string(),
      email: v.string(),
      description: v.string(),
      firmName: v.optional(v.string()),
      title: v.optional(v.string()),
      location: v.string(),
      website: v.optional(v.string()),
      linkedInUrl: v.optional(v.string()),
      preferredIndustries: v.array(v.string()),
    })),
  },
  handler: async (ctx, args): Promise<{ imported: number; skipped: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) throw new ConvexError({ message: "Only admins can bulk import investors", code: "FORBIDDEN" });

    // Deduplicate against existing emails
    const existing = await ctx.db.query("investors").collect();
    const existingEmails = new Set(existing.map((i) => i.email.toLowerCase().trim()));

    const toInsert: typeof args.records = [];
    let skipped = 0;

    for (const rec of args.records) {
      const emailKey = rec.email.toLowerCase().trim();
      if (!emailKey || existingEmails.has(emailKey)) {
        skipped++;
        continue;
      }
      existingEmails.add(emailKey);
      toInsert.push(rec);
    }

    // Insert first chunk inline; schedule subsequent chunks so this call returns fast
    const CHUNK = 25;
    const firstChunk = toInsert.slice(0, CHUNK);
    if (firstChunk.length > 0) {
      for (const rec of firstChunk) {
        await ctx.db.insert("investors", {
          name: rec.name,
          email: rec.email,
          description: rec.description || "",
          firmName: rec.firmName,
          title: rec.title,
          type: "vc" as const,
          location: rec.location || "",
          website: rec.website,
          linkedInUrl: rec.linkedInUrl,
          minInvestment: 0,
          maxInvestment: 0,
          preferredStages: [],
          preferredIndustries: rec.preferredIndustries,
          portfolioCount: 0,
          status: "active" as const,
        });
      }
    }

    for (let i = CHUNK; i < toInsert.length; i += CHUNK) {
      await ctx.scheduler.runAfter(0, internal.investors.bulkImportChunk, {
        rows: toInsert.slice(i, i + CHUNK),
      });
    }

    return { imported: toInsert.length, skipped };
  },
});

export const remove = mutation({
  args: { id: v.id("investors") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) throw new ConvexError({ message: "Only admins can delete investor profiles", code: "FORBIDDEN" });

    // Clear all matches referencing this investor before deleting
    const relatedMatches = await ctx.db.query("matches").withIndex("by_investor", (q) => q.eq("investorId", args.id)).collect();
    for (const match of relatedMatches) {
      await ctx.db.delete(match._id);
    }
    await ctx.db.delete(args.id);
  },
});
