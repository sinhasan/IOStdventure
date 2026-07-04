import { mutation, query, internalMutation } from "./_generated/server";
import { v, ConvexError } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { internal } from "./_generated/api.js";
import type { Doc } from "./_generated/dataModel.d.ts";

type ImportResult = { created: number; updated: number; skippedDuplicates: number; failed: number; errors: string[] };

const ADMIN_EMAILS = ["sinhasan@gmail.com", "ifundindia@gmail.com"];

function isAdminRole(role: string | undefined | null): boolean {
  return role === "superadmin" || role === "admin";
}

// Admin paginated list — server-side pagination, optional JS search filter
export const adminListPaginated = query({
  args: { paginationOpts: paginationOptsValidator, search: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const empty = { page: [] as Doc<"startups">[], isDone: true, continueCursor: "" };
    if (!identity) return empty;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return empty;
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) return empty;

    const result = await ctx.db.query("startups").order("desc").paginate(args.paginationOpts);

    if (args.search && args.search.trim() !== "") {
      const q = args.search.toLowerCase();
      return {
        ...result,
        page: result.page.filter(
          (s) => s.name.toLowerCase().includes(q) || s.industry.toLowerCase().includes(q)
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
      const all = await ctx.db.query("startups").collect();
      return { total: all.length };
    } catch {
      return { total: 0 };
    }
  },
});

// Strip sensitive contact fields from startup records for non-admins
function maskStartup(startup: Doc<"startups">) {
  return {
    ...startup,
    email: "••••••••@••••••",
    website: startup.website ? "Hidden until introduction" : undefined,
  };
}

export const list = query({
  args: {
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
    industry: v.optional(v.string()),
    stage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return [];

    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");

    // Investors cannot access the startup list directly
    if (user.role === "investor") return [];

    let startups;
    if (args.status) {
      startups = await ctx.db.query("startups").withIndex("by_status", (idx) => idx.eq("status", args.status!)).collect();
    } else {
      startups = await ctx.db.query("startups").collect();
    }

    // Admins and startups (own profile) see everything
    if (isAdmin || user.role === "startup") return startups;

    // Everyone else gets masked data
    return startups.map(maskStartup);
  },
});

export const get = query({
  args: { id: v.id("startups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;

    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    const startup = await ctx.db.get(args.id);
    if (!startup) return null;

    // Investors cannot fetch startup details
    if (user.role === "investor") return null;

    return isAdmin || user.role === "startup" ? startup : maskStartup(startup);
  },
});

// Get the startup profile owned by the current user
export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return null;
    return await ctx.db.query("startups").withIndex("by_userId", (q) => q.eq("userId", user._id)).first();
  },
});

// Count how many matches exist for the current user's startup
export const getMyMatchCount = query({
  args: {},
  handler: async (ctx): Promise<number> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return 0;
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) return 0;
    const startup = await ctx.db.query("startups").withIndex("by_userId", (q) => q.eq("userId", user._id)).first();
    if (!startup) return 0;
    const matches = await ctx.db.query("matches").withIndex("by_startup", (q) => q.eq("startupId", startup._id)).collect();
    return matches.length;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    description: v.string(),
    industry: v.string(),
    stage: v.union(
      v.literal("pre-seed"),
      v.literal("seed"),
      v.literal("series-a"),
      v.literal("series-b"),
      v.literal("series-c+")
    ),
    location: v.string(),
    website: v.optional(v.string()),
    fundingNeeded: v.number(),
    teamSize: v.number(),
    tags: v.array(v.string()),
    logoUrl: v.optional(v.string()),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin && user.role !== "startup") {
      throw new ConvexError({ message: "Not authorized to create startup profiles", code: "FORBIDDEN" });
    }
    return await ctx.db.insert("startups", { ...args, status: "active" });
  },
});

export const update = mutation({
  args: {
    id: v.id("startups"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    description: v.optional(v.string()),
    industry: v.optional(v.string()),
    stage: v.optional(v.union(
      v.literal("pre-seed"),
      v.literal("seed"),
      v.literal("series-a"),
      v.literal("series-b"),
      v.literal("series-c+")
    )),
    location: v.optional(v.string()),
    website: v.optional(v.string()),
    fundingNeeded: v.optional(v.number()),
    teamSize: v.optional(v.number()),
    tags: v.optional(v.array(v.string())),
    status: v.optional(v.union(v.literal("active"), v.literal("inactive"))),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");

    // Only admins or the owning startup can update
    if (!isAdmin) {
      const startup = await ctx.db.get(args.id);
      if (!startup || startup.userId !== user._id) {
        throw new ConvexError({ message: "Not authorized to edit this startup profile", code: "FORBIDDEN" });
      }
    }

    const { id, ...rest } = args;
    await ctx.db.patch(id, rest);
  },
});

export const remove = mutation({
  args: { id: v.id("startups") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });

    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) throw new ConvexError({ message: "Only admins can delete startup profiles", code: "FORBIDDEN" });

    // Clear all matches referencing this startup (keep the startup record)
    const relatedMatches = await ctx.db.query("matches").withIndex("by_startup", (q) => q.eq("startupId", args.id)).collect();
    for (const match of relatedMatches) {
      await ctx.db.delete(match._id);
    }
    await ctx.db.delete(args.id);
  },
});

// ── Internal mutation that inserts a single chunk of startup rows ──
export const bulkImportChunk = internalMutation({
  args: {
    rows: v.array(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      foundedYear: v.optional(v.number()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      industry: v.string(),
      stage: v.string(),
      sectors: v.optional(v.string()),
      oneLinerPitch: v.optional(v.string()),
      fundingRaisedInr: v.optional(v.number()),
      amountSeekingInr: v.optional(v.number()),
      teamSize: v.optional(v.number()),
      website: v.optional(v.string()),
      linkedInUrl: v.optional(v.string()),
      description: v.string(),
      rowIndex: v.number(),
    })),
    mode: v.union(v.literal("create_only"), v.literal("create_or_update")),
  },
  handler: async (ctx, args) => {
    const VALID_STAGES = ["pre-seed", "seed", "series-a", "series-b", "series-c+"];

    for (const row of args.rows) {
      const location = [row.city, row.state].filter(Boolean).join(", ") || "India";
      const stageRaw = (row.stage ?? "").trim().toLowerCase().replace(/\s+/g, "-");
      const stage = VALID_STAGES.includes(stageRaw)
        ? (stageRaw as "pre-seed" | "seed" | "series-a" | "series-b" | "series-c+")
        : "seed";

      await ctx.db.insert("startups", {
        name: row.name,
        email: row.email,
        phone: row.phone,
        description: row.description || "",
        industry: row.industry || "Other",
        stage,
        location,
        city: row.city,
        state: row.state,
        website: row.website || undefined,
        fundingNeeded: row.amountSeekingInr ?? 0,
        teamSize: row.teamSize ?? 1,
        tags: row.sectors ? row.sectors.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
        sectors: row.sectors,
        oneLinerPitch: row.oneLinerPitch,
        foundedYear: row.foundedYear,
        fundingRaisedInr: row.fundingRaisedInr,
        amountSeekingInr: row.amountSeekingInr,
        linkedInUrl: row.linkedInUrl,
        status: "active" as const,
      });
    }
  },
});

// ── Bulk import startups from CSV ──
export const bulkImport = mutation({
  args: {
    rows: v.array(v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
      foundedYear: v.optional(v.number()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      industry: v.string(),
      stage: v.string(),
      sectors: v.optional(v.string()),
      oneLinerPitch: v.optional(v.string()),
      fundingRaisedInr: v.optional(v.number()),
      amountSeekingInr: v.optional(v.number()),
      teamSize: v.optional(v.number()),
      website: v.optional(v.string()),
      linkedInUrl: v.optional(v.string()),
      description: v.string(),
      rowIndex: v.number(),
    })),
    mode: v.union(v.literal("create_only"), v.literal("create_or_update")),
  },
  handler: async (ctx, args): Promise<ImportResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError({ message: "Not authenticated", code: "UNAUTHENTICATED" });
    const user = await ctx.db.query("users").withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier)).unique();
    if (!user) throw new ConvexError({ message: "User not found", code: "NOT_FOUND" });
    const isAdmin = isAdminRole(user.role) || ADMIN_EMAILS.includes(user.email ?? "");
    if (!isAdmin) throw new ConvexError({ message: "Only admins can bulk import startups", code: "FORBIDDEN" });

    // Build lookup map: name+website → existing record
    const existing = await ctx.db.query("startups").collect();
    const existingMap = new Map<string, typeof existing[0]>();
    for (const s of existing) {
      const key = `${s.name.trim().toLowerCase()}|||${(s.website ?? "").trim().toLowerCase()}`;
      existingMap.set(key, s);
    }

    const result: ImportResult = { created: 0, updated: 0, skippedDuplicates: 0, failed: 0, errors: [] };

    // Valid stage values
    const VALID_STAGES = ["pre-seed", "seed", "series-a", "series-b", "series-c+"];

    // Filter and validate rows, then dedupe
    type ValidRow = typeof args.rows[number];
    const toInsert: ValidRow[] = [];

    for (const row of args.rows) {
      // Validate email is present
      if (!row.email || row.email.trim() === "") {
        result.errors.push(`Row ${row.rowIndex}: Missing required field: Email`);
        result.failed++;
        continue;
      }

      const key = `${row.name.trim().toLowerCase()}|||${(row.website ?? "").trim().toLowerCase()}`;
      const match = existingMap.get(key);

      if (match) {
        if (args.mode === "create_only") {
          result.skippedDuplicates++;
        } else {
          const location = [row.city, row.state].filter(Boolean).join(", ") || "India";
          const stageRaw = (row.stage ?? "").trim().toLowerCase().replace(/\s+/g, "-");
          const stage = VALID_STAGES.includes(stageRaw)
            ? (stageRaw as "pre-seed" | "seed" | "series-a" | "series-b" | "series-c+")
            : "seed";
          await ctx.db.patch(match._id, {
            name: row.name,
            email: row.email,
            phone: row.phone,
            description: row.description || "",
            industry: row.industry || "Other",
            stage,
            location,
            city: row.city,
            state: row.state,
            website: row.website || undefined,
            fundingNeeded: row.amountSeekingInr ?? 0,
            teamSize: row.teamSize ?? 1,
            tags: row.sectors ? row.sectors.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
            sectors: row.sectors,
            oneLinerPitch: row.oneLinerPitch,
            foundedYear: row.foundedYear,
            fundingRaisedInr: row.fundingRaisedInr,
            amountSeekingInr: row.amountSeekingInr,
            linkedInUrl: row.linkedInUrl,
          });
          result.updated++;
        }
      } else {
        // Mark as seen so later rows in same batch don't duplicate
        existingMap.set(key, undefined as unknown as typeof existing[0]);
        toInsert.push(row);
      }
    }

    // Insert first 25 inline; schedule remaining chunks
    const CHUNK = 25;
    const firstChunk = toInsert.slice(0, CHUNK);
    for (const row of firstChunk) {
      const location = [row.city, row.state].filter(Boolean).join(", ") || "India";
      const stageRaw = (row.stage ?? "").trim().toLowerCase().replace(/\s+/g, "-");
      const stage = VALID_STAGES.includes(stageRaw)
        ? (stageRaw as "pre-seed" | "seed" | "series-a" | "series-b" | "series-c+")
        : "seed";
      await ctx.db.insert("startups", {
        name: row.name,
        email: row.email,
        phone: row.phone,
        description: row.description || "",
        industry: row.industry || "Other",
        stage,
        location,
        city: row.city,
        state: row.state,
        website: row.website || undefined,
        fundingNeeded: row.amountSeekingInr ?? 0,
        teamSize: row.teamSize ?? 1,
        tags: row.sectors ? row.sectors.split(/[,;|]/).map((t) => t.trim()).filter(Boolean) : [],
        sectors: row.sectors,
        oneLinerPitch: row.oneLinerPitch,
        foundedYear: row.foundedYear,
        fundingRaisedInr: row.fundingRaisedInr,
        amountSeekingInr: row.amountSeekingInr,
        linkedInUrl: row.linkedInUrl,
        status: "active" as const,
      });
    }

    for (let i = CHUNK; i < toInsert.length; i += CHUNK) {
      await ctx.scheduler.runAfter(0, internal.startups.bulkImportChunk, {
        rows: toInsert.slice(i, i + CHUNK),
        mode: args.mode,
      });
    }

    result.created = toInsert.length;
    return result;
  },
});
