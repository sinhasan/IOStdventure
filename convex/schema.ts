import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    tokenIdentifier: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    avatar: v.optional(v.string()),
    role: v.optional(v.union(v.literal("superadmin"), v.literal("admin"), v.literal("startup"), v.literal("investor"), v.literal("partner"))),
  }).index("by_token", ["tokenIdentifier"]),

  invitations: defineTable({
    email: v.string(),
    type: v.union(v.literal("startup"), v.literal("investor")),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("expired")),
    token: v.string(),
    invitedBy: v.id("users"),
    message: v.optional(v.string()),
  })
    .index("by_token", ["token"])
    .index("by_email", ["email"])
    .index("by_status", ["status"]),

  startups: defineTable({
    userId: v.optional(v.id("users")),
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
    status: v.union(v.literal("active"), v.literal("inactive")),
    // Extended fields for CSV import
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    sectors: v.optional(v.string()),
    oneLinerPitch: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    fundingRaisedInr: v.optional(v.number()),
    amountSeekingInr: v.optional(v.number()),
    linkedInUrl: v.optional(v.string()),
    phone: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_industry", ["industry"])
    .index("by_stage", ["stage"])
    .index("by_status", ["status"]),

  investors: defineTable({
    userId: v.optional(v.id("users")),
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
    status: v.union(v.literal("active"), v.literal("inactive")),
  })
    .index("by_userId", ["userId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"]),

  matches: defineTable({
    startupId: v.id("startups"),
    investorId: v.id("investors"),
    score: v.number(),
    status: v.union(
      v.literal("suggested"),
      v.literal("intro-requested"),
      v.literal("intro-sent"),
      v.literal("meeting-scheduled"),
      v.literal("deal-closed"),
      v.literal("rejected")
    ),
    notes: v.optional(v.string()),
    createdBy: v.id("users"),
  })
    .index("by_startup", ["startupId"])
    .index("by_investor", ["investorId"])
    .index("by_status", ["status"])
    .index("by_startup_investor", ["startupId", "investorId"]),

  userProfiles: defineTable({
    userId: v.id("users"),
    // Step 1 — Basic Info
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    bio: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    linkedInUrl: v.optional(v.string()),
    // Step 2 — Role-specific (startup)
    startupName: v.optional(v.string()),
    foundedYear: v.optional(v.number()),
    industry: v.optional(v.string()),
    startupStage: v.optional(v.string()),
    oneLinerPitch: v.optional(v.string()),
    website: v.optional(v.string()),
    teamSize: v.optional(v.number()),
    // Step 2 — Role-specific (investor)
    firmName: v.optional(v.string()),
    investorType: v.optional(v.string()),
    minTicket: v.optional(v.number()),
    maxTicket: v.optional(v.number()),
    preferredStages: v.optional(v.array(v.string())),
    // Step 3 — Startup
    sectors: v.optional(v.array(v.string())),
    sectorsOther: v.optional(v.string()),
    fundingRaised: v.optional(v.number()),
    amountSeeking: v.optional(v.number()),
    // Step 3 — Investor
    portfolioCompanies: v.optional(v.string()),
    preferredSectors: v.optional(v.array(v.string())),
    preferredSectorsOther: v.optional(v.string()),
    // Completion tracking
    step1Complete: v.optional(v.boolean()),
    step2Complete: v.optional(v.boolean()),
    step3Complete: v.optional(v.boolean()),
  }).index("by_userId", ["userId"]),

  matchingPayments: defineTable({
    userId: v.id("users"),
    linkId: v.string(),
    status: v.union(v.literal("pending"), v.literal("paid")),
    amount: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_linkId", ["linkId"]),

  // Connections between a startup user and an investor user after payment
  connections: defineTable({
    startupUserId: v.id("users"),
    investorUserId: v.id("users"),
    initiatorUserId: v.id("users"),
    status: v.union(v.literal("pending_payment"), v.literal("active")),
    paymentLinkId: v.optional(v.string()),
  })
    .index("by_startup", ["startupUserId"])
    .index("by_investor", ["investorUserId"])
    .index("by_startup_investor", ["startupUserId", "investorUserId"]),

  // Tracks paid unlocks of admin-added profiles (which have no user account)
  contactUnlocks: defineTable({
    unlockerUserId: v.id("users"),    // the user who paid
    targetProfileId: v.string(),      // the admin-added startup/investor _id
    targetType: v.union(v.literal("startup"), v.literal("investor")),
    orderId: v.string(),              // Cashfree order_id
    status: v.union(v.literal("pending_payment"), v.literal("active")),
  })
    .index("by_unlocker", ["unlockerUserId"])
    .index("by_orderId", ["orderId"])
    .index("by_unlocker_target", ["unlockerUserId", "targetProfileId"]),



  // Sector Pack purchases: unlocks all profiles in a sector for 6 months
  sectorPacks: defineTable({
    userId: v.id("users"),
    sector: v.string(),
    orderId: v.string(),
    expiresAt: v.string(), // ISO 8601 UTC
    status: v.union(v.literal("active"), v.literal("expired")),
  })
    .index("by_userId", ["userId"])
    .index("by_orderId", ["orderId"])
    .index("by_userId_sector", ["userId", "sector"]),

  // Full Access Pass: unlocks ALL profiles for 6 months
  fullAccessPasses: defineTable({
    userId: v.id("users"),
    orderId: v.string(),
    expiresAt: v.string(), // ISO 8601 UTC
    status: v.union(v.literal("active"), v.literal("expired")),
    renewalReminderSent: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_orderId", ["orderId"])
    .index("by_status", ["status"]),



  // ─── Partner Program ─────────────────────────────────────────────────────────

  /** One record per partner, auto-created on first visit to /partner */
  partners: defineTable({
    userId: v.id("users"),
    name: v.string(),
    email: v.string(),
    role: v.optional(v.string()),   // e.g. "consultant", "influencer", etc.
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

  /** Referrals submitted by partners */
  partnerReferrals: defineTable({
    partnerId: v.id("partners"),
    type: v.union(v.literal("startup"), v.literal("investor")),
    referredName: v.string(),
    referredEmail: v.string(),
    notes: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("signed_up"),
      v.literal("paid")
    ),
    paymentAmount: v.optional(v.number()),    // INR, set when marked paid
    commissionAmount: v.optional(v.number()), // 20% of paymentAmount
  })
    .index("by_partnerId", ["partnerId"])
    .index("by_status", ["status"])
    .index("by_referredEmail", ["referredEmail"]),
});
