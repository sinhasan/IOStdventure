"use node";

import escapeHtml from "escape-html";
import { Hercules } from "@usehercules/sdk";
import { v } from "convex/values";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { FULL_ACCESS_FEE } from "./premiumTiers.ts";

const hercules = new Hercules({
  apiKey: process.env.HERCULES_API_KEY,
  apiVersion: "2025-12-09",
});

// ── Send invitation email ──
export const sendInvitationEmail = internalAction({
  args: {
    to: v.string(),
    type: v.union(v.literal("startup"), v.literal("investor")),
    message: v.optional(v.string()),
    token: v.string(),
    invitedByName: v.optional(v.string()),
    senderEmail: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<void> => {
    const role = args.type === "startup" ? "Startup" : "Investor";
    const inviteUrl = `${process.env.SITE_URL ?? "https://crm.fundind.com"}/onboarding?token=${args.token}`;
    try {
      await hercules.email.send({
        from: "noreply@fundind.com",
        to: args.to,
        subject: `You've been invited to join Fundind as a ${role}`,
        html: `
          <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#fff">
            <h1 style="color:#111827;font-size:22px;margin-bottom:8px">You're invited to Fundind</h1>
            <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:16px">
              ${args.invitedByName ? `<strong>${escapeHtml(args.invitedByName)}</strong> has invited you to join as a <strong>${escapeHtml(role)}</strong>.` : `You've been invited to join as a <strong>${escapeHtml(role)}</strong>.`}
            </p>
            ${args.message ? `<p style="color:#6b7280;font-size:14px;font-style:italic;margin-bottom:20px">"${escapeHtml(args.message)}"</p>` : ""}
            <a href="${escapeHtml(inviteUrl)}"
              style="display:inline-block;background:#6366f1;color:#fff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">
              Accept Invitation
            </a>
            <p style="color:#9ca3af;font-size:13px">This link expires in 7 days.</p>
          </div>
        `,
      });
    } catch (err) {
      console.error("Failed to send invitation email to", args.to, err);
    }
  },
});

// ── Send renewal reminder emails for passes expiring in 30 days ──
export const sendRenewalReminders = internalAction({
  args: {},
  handler: async (ctx): Promise<void> => {
    const passesDueSoon = await ctx.runMutation(internal.premiumTiers.getPassesDueSoon, {});

    for (const { userId, expiresAt } of passesDueSoon) {
      // Fetch user email via internal query
      const user = await ctx.runQuery(internal.users.getUserById, { userId });
      if (!user?.email) continue;

      const expiryDate = new Date(expiresAt).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      });

      try {
        await hercules.email.send({
          from: "noreply@fundind.com",
          to: user.email,
          subject: `Your Full Access Pass expires in 30 days — Renew now`,
          html: `
            <div style="font-family:sans-serif;max-width:520px;margin:auto;padding:32px 24px;background:#fff">
              <h1 style="color:#111827;font-size:22px;margin-bottom:8px">Your Full Access Pass is expiring soon</h1>
              <p style="color:#6b7280;font-size:15px;margin-bottom:24px">
                Hi ${escapeHtml(user.name ?? "there")},
              </p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin-bottom:24px">
                Your <strong>Full Access Pass</strong> expires on <strong>${escapeHtml(expiryDate)}</strong>.
                After that, all profiles you haven't individually connected with will be locked again.
              </p>
              <a href="https://crm.fundind.com/discover/investors"
                style="display:inline-block;background:#6366f1;color:#fff;font-size:15px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;margin-bottom:24px">
                Renew Full Access — ₹${FULL_ACCESS_FEE.toLocaleString("en-IN")}
              </a>
              <p style="color:#9ca3af;font-size:13px">
                If you have questions, reply to this email. The Fundind team is here to help.
              </p>
            </div>
          `,
        });
      } catch (err) {
        console.error("Failed to send renewal reminder to", user.email, err);
      }
    }
  },
});
