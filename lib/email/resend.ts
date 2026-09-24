import { Resend } from "resend";
import { isSyntheticPhoneEmail } from "@/lib/user-display";

const BRAND_GREEN = "#0F5132";
const BRAND_GOLD = "#D4AF37";
const BRAND_CREAM = "#F7F4EF";
const BRAND_INK = "#0A3D26";

function siteUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim() ||
    "";
  if (!raw) return "https://bharwanaestates.com";
  return raw.startsWith("http") ? raw.replace(/\/$/, "") : `https://${raw.replace(/\/$/, "")}`;
}

function fromAddress(): string | null {
  const from = process.env.RESEND_FROM_EMAIL?.trim();
  return from || null;
}

/** Optional BCC so admin keeps a copy of outbound rejection mail. */
function rejectionBcc(): string | undefined {
  const bcc = process.env.RESEND_REJECTION_BCC?.trim().toLowerCase();
  if (!bcc || !bcc.includes("@")) return undefined;
  return bcc;
}

function resendClient(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

export function isDeliverableUserEmail(email: string | null | undefined): email is string {
  const value = String(email ?? "")
    .trim()
    .toLowerCase();
  if (!value || !value.includes("@")) return false;
  if (isSyntheticPhoneEmail(value)) return false;
  return true;
}

export type SendResult =
  | { sent: true }
  | { sent: false; skipped: true; reason: string }
  | { sent: false; error: string };

async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Stable key so Resend / retries do not deliver the same reject twice. */
  idempotencyKey: string;
}): Promise<SendResult> {
  if (!isDeliverableUserEmail(input.to)) {
    return { sent: false, skipped: true, reason: "no_deliverable_email" };
  }

  const client = resendClient();
  const from = fromAddress();
  if (!client || !from) {
    console.warn("[email] Resend not configured (RESEND_API_KEY / RESEND_FROM_EMAIL); skipping send.");
    return { sent: false, skipped: true, reason: "resend_not_configured" };
  }

  const bcc = rejectionBcc();
  // Never BCC the same address as the recipient.
  const bccList =
    bcc && bcc !== input.to.trim().toLowerCase() ? [bcc] : undefined;

  try {
    const { data, error } = await client.emails.send(
      {
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(bccList ? { bcc: bccList } : {}),
      },
      { idempotencyKey: input.idempotencyKey },
    );
    if (error) {
      console.error("[email] Resend API error", {
        message: error.message,
        name: error.name,
        idempotencyKey: input.idempotencyKey,
      });
      return { sent: false, error: error.message || "Resend send failed" };
    }
    console.info("[email] Resend accepted", {
      id: data?.id,
      to: input.to,
      bcc: bccList?.[0] ?? null,
      idempotencyKey: input.idempotencyKey,
    });
    return { sent: true };
  } catch (error) {
    console.error("[email] Resend exception", {
      error,
      idempotencyKey: input.idempotencyKey,
    });
    return {
      sent: false,
      error: error instanceof Error ? error.message : "Resend send failed",
    };
  }
}

function wrapHtml(input: { headline: string; body: string }): string {
  const logoUrl = `${siteUrl()}/logo.png`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Bharwana Estates</title>
</head>
<body style="margin:0;padding:0;background:${BRAND_CREAM};">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:${BRAND_CREAM};padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid rgba(15,81,50,0.14);overflow:hidden;">
        <tr>
          <td style="background:${BRAND_GREEN};padding:28px 28px 24px;text-align:center;">
            <img src="${logoUrl}" width="64" height="64" alt="Bharwana Estates" style="display:block;margin:0 auto 14px;border:0;outline:none;" />
            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;color:${BRAND_GOLD};">Bharwana Estates</p>
            <h1 style="margin:12px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:normal;line-height:1.25;color:#ffffff;">${input.headline}</h1>
          </td>
        </tr>
        <tr>
          <td style="height:4px;background:${BRAND_GOLD};font-size:0;line-height:0;">&nbsp;</td>
        </tr>
        <tr>
          <td style="padding:28px 28px 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:15px;line-height:1.6;color:${BRAND_INK};">
            ${input.body}
          </td>
        </tr>
        <tr>
          <td style="padding:8px 28px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:12px;line-height:1.5;color:#6b7c72;">
            <p style="margin:0;">This message was sent by Bharwana Estates Developer regarding your account activity.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function ctaButton(href: string, label: string): string {
  return `<p style="margin:0 0 8px;"><a href="${href}" style="display:inline-block;background:${BRAND_GOLD};color:${BRAND_GREEN};text-decoration:none;padding:14px 22px;font-size:13px;font-weight:600;letter-spacing:0.06em;border-radius:2px;">${escapeHtml(label)}</a></p>`;
}

function reasonBlock(reason: string): string {
  return `
    <p style="margin:0 0 8px;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;color:#6b7c72;">Reason</p>
    <p style="margin:0 0 22px;padding:14px 16px;background:${BRAND_CREAM};border-left:4px solid ${BRAND_GOLD};color:${BRAND_INK};">${escapeHtml(reason)}</p>
  `;
}

export async function sendPropertyRejectionEmail(input: {
  to: string;
  recipientName?: string;
  propertyTitle: string;
  reason: string;
  listingsPath: "/owner" | "/dealer";
  /** e.g. property id — forms Resend idempotency key */
  entityId: string;
}): Promise<SendResult> {
  const base = siteUrl();
  const href = `${base}${input.listingsPath}`;
  const name = input.recipientName?.trim() || "there";
  const title = input.propertyTitle.trim() || "your listing";
  const reason = input.reason.trim();

  const text = [
    `Hello ${name},`,
    "",
    `Your listing “${title}” was not approved.`,
    "",
    `Reason: ${reason}`,
    "",
    `Review and update it here: ${href}`,
    "",
    "— Bharwana Estates",
  ].join("\n");

  const html = wrapHtml({
    headline: "Listing update",
    body: `
      <p style="margin:0 0 14px;">Hello ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px;">Your listing <strong>${escapeHtml(title)}</strong> was not approved.</p>
      ${reasonBlock(reason)}
      <p style="margin:0 0 22px;">You can edit the listing and resubmit from My Listings.</p>
      ${ctaButton(href, "Open My Listings")}
    `,
  });

  return sendEmail({
    to: input.to,
    subject: `Listing update: ${title}`,
    html,
    text,
    idempotencyKey: `reject-property-${input.entityId}`,
  });
}

export async function sendDealerRejectionEmail(input: {
  to: string;
  recipientName?: string;
  companyName: string;
  reason: string;
  entityId: string;
}): Promise<SendResult> {
  const base = siteUrl();
  const href = `${base}/dealer`;
  const name = input.recipientName?.trim() || "there";
  const company = input.companyName.trim() || "your agency";
  const reason = input.reason.trim();

  const text = [
    `Hello ${name},`,
    "",
    `Your dealer account for “${company}” was not approved.`,
    "",
    `Reason: ${reason}`,
    "",
    `Edit your agency details and resubmit for review here: ${href}`,
    "",
    "— Bharwana Estates",
  ].join("\n");

  const html = wrapHtml({
    headline: "Dealer account update",
    body: `
      <p style="margin:0 0 14px;">Hello ${escapeHtml(name)},</p>
      <p style="margin:0 0 18px;">Your dealer account for <strong>${escapeHtml(company)}</strong> was not approved.</p>
      ${reasonBlock(reason)}
      <p style="margin:0 0 22px;">You can edit your agency details and resubmit for review from your dealer desk.</p>
      ${ctaButton(href, "Edit & Resubmit")}
    `,
  });

  return sendEmail({
    to: input.to,
    subject: `Dealer account update: ${company}`,
    html,
    text,
    idempotencyKey: `reject-dealer-${input.entityId}`,
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
