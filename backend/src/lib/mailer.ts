/* SMTP via nodemailer; skipped when SMTP_HOST is empty */
import nodemailer from 'nodemailer';
import {env} from '../config/env.js';
import {log} from './logger.js';

const transport = env.mail.enabled
  ? nodemailer.createTransport({
      host: env.mail.host,
      port: env.mail.port,
      secure: env.mail.secure,
      auth: env.mail.user ? {user: env.mail.user, pass: env.mail.pass} : undefined
    })
  : null;

export async function verifyMailer() {
  if (!transport) {
    log.info('Email off (SMTP_HOST empty).');
    return;
  }
  try {
    await transport.verify();
    log.info(`SMTP ready: ${env.mail.host}:${env.mail.port}`);
  } catch (e) {
    log.warn(`SMTP check failed (${env.mail.host}:${env.mail.port}): ${(e as Error).message}. Emails may not send.`);
  }
}

export async function sendMail(msg: {to: string | string[]; subject: string; text: string; replyTo?: string}) {
  if (!transport) {
    log.debug(`Email skipped (SMTP off): "${msg.subject}" → ${msg.to}`);
    return false;
  }
  try {
    await transport.sendMail({from: env.mail.from, ...msg});
    log.debug(`Email sent: "${msg.subject}" → ${msg.to}`);
    return true;
  } catch (e) {
    log.error(`Email failed: "${msg.subject}" → ${msg.to}: ${(e as Error).message}`);
    return false;
  }
}
