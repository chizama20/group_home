import { Resend } from 'resend';

let resend: Resend;

function getResend(): Resend {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

const FROM = process.env.RESEND_FROM_EMAIL ?? 'noreply@example.com';

// ─── No PHI in any email body ─────────────────────────────────────────────
// No resident names, diagnoses, or medication details — only links and generic text.

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
): Promise<void> {
  await getResend().emails.send({
    from:    FROM,
    to,
    subject: `You've been invited to join ${orgName}`,
    html: `
      <p>Hi,</p>
      <p><strong>${inviterName}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${role}</strong>.</p>
      <p><a href="${inviteUrl}">Accept your invitation</a></p>
      <p>This link expires in 48 hours.</p>
      <p>If you weren't expecting this invitation, you can safely ignore this email.</p>
    `,
  });
}

export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<void> {
  await getResend().emails.send({
    from:    FROM,
    to,
    subject: 'Reset your password',
    html: `
      <p>Hi,</p>
      <p>We received a request to reset the password for your account.</p>
      <p><a href="${resetUrl}">Reset your password</a></p>
      <p>This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    `,
  });
}

export async function sendOrgApprovedEmail(
  to: string,
  orgName: string,
  loginUrl: string
): Promise<void> {
  await getResend().emails.send({
    from:    FROM,
    to,
    subject: `${orgName} has been approved — next steps`,
    html: `
      <p>Hi,</p>
      <p>Your organisation <strong>${orgName}</strong> has been approved.</p>
      <p>Please check your email for a separate message from DocuSign to sign your Business Associate Agreement (BAA). Your account will be activated once the BAA is signed.</p>
      <p>Questions? Reply to this email.</p>
    `,
  });
}

export async function sendOrgRejectedEmail(
  to: string,
  orgName: string,
  reason: string
): Promise<void> {
  await getResend().emails.send({
    from:    FROM,
    to,
    subject: `Update on your request for ${orgName}`,
    html: `
      <p>Hi,</p>
      <p>After reviewing your request for <strong>${orgName}</strong>, we're unable to approve it at this time.</p>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
      <p>If you have questions, reply to this email.</p>
    `,
  });
}

export async function sendWelcomeEmail(
  to: string,
  firstName: string,
  orgName: string,
  loginUrl: string
): Promise<void> {
  await getResend().emails.send({
    from:    FROM,
    to,
    subject: `Welcome to ${orgName} — your account is ready`,
    html: `
      <p>Hi ${firstName},</p>
      <p>Your account for <strong>${orgName}</strong> is now active.</p>
      <p><a href="${loginUrl}">Log in to get started</a></p>
    `,
  });
}
