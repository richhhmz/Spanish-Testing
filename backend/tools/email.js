// backend/tools/email.js
import sgMail from '@sendgrid/mail';
import {
  isProd,
  APP_BASE_URL,
  SENDGRID_API_KEY,
  SENDGRID_FROM_EMAIL
} from '../config.js';

if (!SENDGRID_API_KEY) {
  console.warn('[email] SENDGRID_API_KEY is missing. Emails will fail to send.');
} else {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

// Basic, safe URL allowlist rules for magic links
function assertSafeLinkUrl(linkUrl) {
  let u;
  try {
    u = new URL(linkUrl);
  } catch {
    throw new Error('Invalid linkUrl (not a URL).');
  }

  // Only allow https in prod
  if (isProd && u.protocol !== 'https:') {
    throw new Error('In production, magic link must be https.');
  }

  // Allow http in dev (localhost), https always ok
  if (!isProd && !(u.protocol === 'http:' || u.protocol === 'https:')) {
    throw new Error('Magic link must be http(s).');
  }

  // Optional: restrict hostnames so links can only go to your site
  // Comment out if you truly need multiple hosts.
  const allowedHosts = new Set([
    new URL(FRONTEND_ORIGIN).host, // e.g. progspanlrn.com or localhost:5173
    'localhost:5173',
    'localhost:3000',
    '127.0.0.1:5173',
    '127.0.0.1:3000',
  ]);

  if (!allowedHosts.has(u.host)) {
    throw new Error(`Magic link host not allowed: ${u.host}`);
  }

  return u.toString();
}

function normalizeEmail(to) {
  if (typeof to !== 'string') throw new Error('Email "to" must be a string.');
  const trimmed = to.trim().toLowerCase();
  // simple sanity check (not perfect, but prevents obvious junk)
  if (!trimmed || !trimmed.includes('@') || trimmed.length > 254) {
    throw new Error('Invalid recipient email.');
  }
  return trimmed;
}

function buildMagicLinkEmail({ linkUrl }) {
  const safeUrl = assertSafeLinkUrl(linkUrl);

  const subject = 'Your sign-in link for Progressive Spanish Learning';

  const text = [
    'Use this link to sign in:',
    safeUrl,
    '',
    'This link will expire soon. If you did not request this email, you can safely ignore it.',
  ].join('\n');

  const html = `
  <div style="font-family: Arial, sans-serif; line-height: 1.4; color: #111;">
    <h2 style="margin:0 0 12px 0;">Sign in to Progressive Spanish Learning</h2>
    <p style="margin:0 0 12px 0;">
      Click the button below to sign in. This link will expire soon.
    </p>

    <p style="margin:16px 0;">
      <a href="${safeUrl}"
         style="display:inline-block; padding:10px 14px; background:#2563eb; color:#fff; text-decoration:none; border-radius:6px;">
        Sign in
      </a>
    </p>

    <p style="margin:0 0 12px 0; font-size: 13px; color:#444;">
      If the button doesn’t work, copy and paste this URL into your browser:
      <br/>
      <a href="${safeUrl}">${safeUrl}</a>
    </p>

    <hr style="border:none; border-top:1px solid #eee; margin:16px 0;" />

    <p style="margin:0; font-size: 12px; color:#666;">
      If you didn’t request this email, you can ignore it.
    </p>
  </div>`;

  return { subject, text, html };
}

/**
 * Backend-owned magic link email sender.
 * Accepts ONLY { to, linkUrl }.
 */
export async function sendMagicLinkEmail({ to, linkUrl }) {
  const normalizedTo = normalizeEmail(to);
  const { subject, text, html } = buildMagicLinkEmail({ linkUrl });

  const from = SENDGRID_FROM_EMAIL || 'no-reply@progspanlrn.com';

  const msg = {
    to: normalizedTo,
    from,
    subject,
    text,
    html,
  };

  if (!SENDGRID_API_KEY) {
    // In dev, you might prefer "log instead of throw" — your choice.
    throw new Error('SENDGRID_API_KEY missing; cannot send email.');
  }

  await sgMail.send(msg);
}
