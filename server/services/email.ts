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

async function send(payload: Parameters<Resend['emails']['send']>[0]): Promise<void> {
  const { error } = await getResend().emails.send(payload);
  if (error) throw new Error(error.message);
}

export async function sendInviteEmail(
  to: string,
  inviteUrl: string,
  inviterName: string,
  orgName: string,
  role: string
): Promise<void> {
  await send({
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
  await send({
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
  await send({
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
  await send({
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
  setPasswordUrl: string
): Promise<void> {
  await send({
    from:    FROM,
    to,
    subject: `Welcome to ${orgName} — set your password to get started`,
    html: `
      <p>Hi ${firstName},</p>
      <p>Your account for <strong>${orgName}</strong> has been approved and is ready to use.</p>
      <p><a href="${setPasswordUrl}">Set your password to get started</a></p>
      <p>This link expires in 48 hours. If it expires, use the forgot password option on the login page.</p>
    `,
  });
}

export async function sendOrgRequestConfirmationEmail(
  to: string,
  orgName: string
): Promise<void> {
  await send({
    from:    FROM,
    to,
    subject: `We received your request for ${orgName}`,
    html: `
      <p>Hi,</p>
      <p>We've received your request to set up <strong>${orgName}</strong>. Our team will review it and be in touch shortly.</p>
      <p>If you have any questions in the meantime, reply to this email.</p>
    `,
  });
}

export async function sendShiftRequestSubmittedEmail(
  to: string,
  requesterName: string,
  date: string,
  shiftType: string,
  homeName: string
): Promise<void> {
  await send({
    from:    FROM,
    to,
    subject: `New time-off request from ${requesterName}`,
    html: `
      <p>Hi,</p>
      <p><strong>${requesterName}</strong> has submitted a time-off request for <strong>${date}</strong> (${shiftType} shift) at <strong>${homeName}</strong>.</p>
      <p>Please log in to review and approve or deny the request.</p>
    `,
  });
}

export async function sendShiftRequestReviewedEmail(
  to: string,
  requesterName: string,
  status: 'approved' | 'denied',
  date: string,
  shiftType: string
): Promise<void> {
  const statusLabel = status === 'approved' ? 'approved' : 'denied';
  await send({
    from:    FROM,
    to,
    subject: `Your time-off request has been ${statusLabel}`,
    html: `
      <p>Hi ${requesterName},</p>
      <p>Your time-off request for <strong>${date}</strong> (${shiftType} shift) has been <strong>${statusLabel}</strong>.</p>
      <p>If you have questions, please contact your manager.</p>
    `,
  });
}
