import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

/**
 * Verifies the Cashfree webhook HMAC-SHA256 signature using the Web Crypto API
 * (compatible with the Convex V8 runtime — no Node.js crypto module needed).
 *
 * Cashfree signs payloads with:
 *   HMAC-SHA256(timestamp + rawBody, CASHFREE_WEBHOOK_SECRET)
 * and sends the base64-encoded result in header "x-webhook-signature".
 * The timestamp is in header "x-webhook-timestamp".
 */
async function verifyCashfreeSignature(
  rawBody: string,
  timestampHeader: string | null,
  signatureHeader: string | null
): Promise<boolean> {
  const secret = process.env.CASHFREE_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("CASHFREE_WEBHOOK_SECRET not set — skipping signature verification (set this in production)");
    return true;
  }
  if (!timestampHeader || !signatureHeader) {
    console.error("Cashfree webhook: missing x-webhook-timestamp or x-webhook-signature headers");
    return false;
  }

  const payload = timestampHeader + rawBody;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const msgData = encoder.encode(payload);

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", cryptoKey, msgData);
  const computedBase64 = btoa(
    String.fromCharCode(...new Uint8Array(signatureBuffer))
  );

  return computedBase64 === signatureHeader;
}

/**
 * Cashfree webhook endpoint for the Orders API.
 * Cashfree sends a POST to this URL on payment events.
 * Always returns 200 OK immediately.
 *
 * Configure in Cashfree Dashboard → Developers → Webhooks:
 *   https://<deployment>.convex.site/cashfree-webhook
 *
 * SECURITY: This is the ONLY place where tiers/connections/unlocks are activated.
 * Access is NEVER granted on order creation — only here after confirmed PAYMENT_SUCCESS
 * AND verified webhook signature.
 */
http.route({
  path: "/cashfree-webhook",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // Read raw body for signature verification before parsing JSON
    let rawBody: string;
    try {
      rawBody = await request.text();
    } catch {
      console.error("Cashfree webhook: failed to read body");
      return new Response(null, { status: 200 });
    }

    // Verify HMAC signature
    const timestamp = request.headers.get("x-webhook-timestamp");
    const signature = request.headers.get("x-webhook-signature");
    if (!verifyCashfreeSignature(rawBody, timestamp, signature)) {
      console.error("Cashfree webhook: INVALID SIGNATURE — rejecting request");
      // Return 200 so Cashfree doesn't retry, but log clearly
      return new Response(null, { status: 200 });
    }

    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      console.error("Cashfree webhook: failed to parse JSON body");
      return new Response(null, { status: 200 });
    }

    // Orders API webhook payload:
    // { type: "PAYMENT_SUCCESS_WEBHOOK", data: { order: { order_id, order_status }, payment: { payment_status, cf_payment_id } } }
    const event = body as {
      type?: string;
      data?: {
        order?: {
          order_id?: string;
          order_status?: string;
          order_amount?: number;
        };
        payment?: {
          payment_status?: string;
          cf_payment_id?: string | number;
        };
      };
    };

    console.log("Cashfree webhook received:", JSON.stringify(event));

    const orderId = event?.data?.order?.order_id;
    const orderStatus = (event?.data?.order?.order_status ?? "").toUpperCase();
    const paymentStatus = (event?.data?.payment?.payment_status ?? "").toUpperCase();
    const orderAmount = event?.data?.order?.order_amount ?? 0;
    const cfPaymentId = event?.data?.payment?.cf_payment_id;

    // STRICT: ONLY proceed on confirmed SUCCESS.
    // paymentStatus must be exactly "SUCCESS" — not PENDING, FAILED, CANCELLED, etc.
    const isPaid = paymentStatus === "SUCCESS" && orderStatus === "PAID";

    if (!orderId || !isPaid) {
      console.log(
        `Cashfree webhook: not a confirmed success — skipping. ` +
          `orderId=${orderId} orderStatus=${orderStatus} paymentStatus=${paymentStatus}`
      );
      return new Response(null, { status: 200 });
    }

    // cf_payment_id is required as the global idempotency key
    if (!cfPaymentId) {
      console.error("Cashfree webhook: missing cf_payment_id — cannot process safely");
      return new Response(null, { status: 200 });
    }

    const cashfreePaymentId = String(cfPaymentId);

    try {
      // 1. Mark the base matchingPayment record as paid (for legacy matching fee flow)
      await ctx.runMutation(internal.paymentRecords.markPaymentPaid, { linkId: orderId });
      console.log(`Payment marked as paid for orderId: ${orderId}`);

      // 2. Auto-credit partner commission if the payer was referred by a partner.
      //    Look up payer email from matchingPayments (works for pay_, con_, scp_, fap_ prefixes).
      try {
        const paymentRecord = await ctx.runQuery(
          internal.paymentRecords.getPaymentRecordByLinkId,
          { linkId: orderId }
        );
        if (paymentRecord?.userId) {
          const payerEmail = await ctx.runQuery(
            internal.paymentRecords.getUserEmailByUserId,
            { userId: paymentRecord.userId }
          );
          if (payerEmail && orderAmount > 0) {
            await ctx.runMutation(internal.partners.internalMarkReferralPaidByEmail, {
              referredEmail: payerEmail,
              paymentAmount: orderAmount,
            });
          }
        }
      } catch (partnerErr) {
        // Non-fatal: log but don't block main payment flow
        console.error("Partner commission lookup failed:", partnerErr);
      }

      // 3. Route to the correct activation based on orderId prefix
      //    con_  → connection unlock
      //    unl_  → admin-added profile contact unlock
      //    scp_  → sector pack
      //    fap_  → full access pass
      if (orderId.startsWith("fap_")) {
        await ctx.runAction(internal.webhookActivations.activateFullAccessFromWebhook, {
          orderId,
          orderAmount,
        });
      } else if (orderId.startsWith("scp_")) {
        await ctx.runAction(internal.webhookActivations.activateSectorPackFromWebhook, {
          orderId,
          orderAmount,
        });
      } else if (orderId.startsWith("unl_")) {
        await ctx.runMutation(internal.webhookActivationMutations.activateContactUnlockFromWebhook, {
          orderId,
        });
      } else if (orderId.startsWith("con_")) {
        await ctx.runMutation(internal.webhookActivationMutations.activateConnectionFromWebhook, {
          orderId,
        });
      } else {
        console.log(`Cashfree webhook: unknown orderId prefix for ${orderId}, only base payment record updated`);
      }
    } catch (err) {
      console.error("Cashfree webhook: error during activation", err);
      // Still return 200 so Cashfree doesn't retry infinitely
    }

    return new Response(null, { status: 200 });
  }),
});

export default http;
