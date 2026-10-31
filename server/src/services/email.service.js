import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const transport = config.smtp.host
  ? nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
    })
  : null;

// Without SMTP settings (local dev) the mail is printed to the server console.
export async function sendMail({ to, subject, text }) {
  if (!transport) {
    console.log(`\n[mail] To: ${to}\n[mail] Subject: ${subject}\n${text}\n`);
    return;
  }
  await transport.sendMail({ from: config.smtp.from, to, subject, text });
}
