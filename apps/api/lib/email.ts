import { Resend } from 'resend';
import { env } from './config';

export async function sendCode(to: string, code: string): Promise<void> {
  const resend = new Resend(env('RESEND_API_KEY'));
  const from = env('FROM_EMAIL'); // e.g. "AIEngineerCV <noreply@frai.cc>"
  const { error } = await resend.emails.send({
    from,
    to,
    subject: `${code} is your AIEngineerCV code`,
    text: `Your AIEngineerCV verification code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, ignore this email.`,
    html: `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;max-width:420px;margin:0 auto;padding:24px;color:#1a1a1a">
      <h2 style="margin:0 0 8px">AIEngineerCV</h2>
      <p style="margin:0 0 16px;color:#555">Your verification code:</p>
      <div style="font:700 30px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:6px;background:#0a0c0d;color:#9fe870;padding:16px;border-radius:10px;text-align:center">${code}</div>
      <p style="margin:16px 0 0;color:#888;font-size:13px">Expires in 10 minutes. If you did not request this, ignore this email.</p>
    </div>`,
  });
  if (error) throw new Error(`Email send failed: ${error.message}`);
}
