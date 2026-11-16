/* Forwards each website lead to LEAD_WEBHOOK_URL (CRM, Zapier, Make, Slack…) as JSON.
   With LEAD_WEBHOOK_SECRET set, the body is signed: X-Elevare-Signature: sha256=<hex HMAC of the raw body>. */
import {createHmac} from 'node:crypto';
import {env} from '../config/env.js';
import {log} from './logger.js';

const ATTEMPTS = 3;
const wait = (ms: number) => new Promise(r => setTimeout(r, ms));

export async function sendLeadWebhook(lead: Record<string, unknown>) {
  const {url, secret} = env.leadWebhook;
  if (!url) return;
  const body = JSON.stringify({event: 'lead.created', lead, sentAt: new Date().toISOString()});
  const headers: Record<string, string> = {'Content-Type': 'application/json', 'User-Agent': 'Elevare-Webhook/1'};
  if (secret) headers['X-Elevare-Signature'] = 'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, {method: 'POST', headers, body, signal: AbortSignal.timeout(8_000)});
      if (res.ok) return log.info(`Lead ${lead.ref ?? ''} sent to the webhook.`);
      if (res.status < 500 && res.status !== 429) {
        return log.warn(`Lead webhook refused the lead: HTTP ${res.status}.`);
      }
      log.warn(`Lead webhook answered HTTP ${res.status} (attempt ${attempt}/${ATTEMPTS}).`);
    } catch (e) {
      log.warn(`Lead webhook unreachable (attempt ${attempt}/${ATTEMPTS}): ${(e as Error).message}`);
    }
    if (attempt < ATTEMPTS) await wait(attempt * 2_000);
  }
  log.error(`Lead ${lead.ref ?? ''} was not delivered to the webhook; it is still saved in the database.`);
}
