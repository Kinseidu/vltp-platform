import sgMail from '@sendgrid/mail';

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'noreply@miningco.gh';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

function isConfigured(): boolean {
  return !!SENDGRID_API_KEY;
}

export async function sendPasswordResetEmail(email: string, token: string): Promise<void> {
  const resetUrl = `${APP_URL}/auth/reset-password/${token}`;

  if (!isConfigured()) {
    console.log(`[Email Stub] Password reset to ${email}: ${resetUrl}`);
    return;
  }

  await sgMail.send({
    to: email,
    from: FROM_EMAIL,
    subject: 'Reset your Verified Local Talent password',
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <div style="background: #1e3a5f; padding: 24px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; margin: 0; font-size: 20px;">Verified Local Talent</h1>
        </div>
        <div style="padding: 32px 24px; border: 1px solid #e2e8f0; border-top: 0; border-radius: 0 0 12px 12px;">
          <h2 style="margin: 0 0 12px; font-size: 18px; color: #1e293b;">Reset your password</h2>
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in 1 hour.
          </p>
          <a href="${resetUrl}" style="display: inline-block; background: #2563eb; color: #fff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 16px 0;">
            Reset Password
          </a>
          <p style="color: #94a3b8; font-size: 12px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      </div>
    `,
  });
}

export async function sendNotificationEmail(email: string, subject: string, html: string): Promise<void> {
  if (!isConfigured()) {
    console.log(`[Email Stub] To ${email}: ${subject}`);
    return;
  }

  await sgMail.send({
    to: email,
    from: FROM_EMAIL,
    subject,
    html,
  });
}
