import crypto from 'crypto';
import { URL } from 'url';

function isSafeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname;
    return !['localhost', '127.0.0.1', '::1', '0.0.0.0'].includes(hostname)
      && !hostname.startsWith('192.168.')
      && !hostname.startsWith('10.');
  } catch { return false; }
}

async function dispatchWithRetry(url: string, opts: any, attempt = 0): Promise<void> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  opts.signal = controller.signal;

  try {
    const res = await fetch(url, opts);
    clearTimeout(timeout);
    if (!res.ok) {
      if (attempt === 0 && res.status >= 500) {
        await new Promise(r => setTimeout(r, 1000));
        return dispatchWithRetry(url, opts, 1);
      }
      console.error(`[Webhook] Target ${url} returned status ${res.status}`);
    }
  } catch (err: any) {
    clearTimeout(timeout);
    if (attempt === 0) {
      return dispatchWithRetry(url, opts, 1);
    }
    console.error(`[Webhook] Dispatch failed to ${url}:`, err.message);
  }
}

export class WebhookDispatcher {
  static dispatch(targetUrl: string, secret: string, event: string, payload: object) {
    if (!isSafeUrl(targetUrl)) {
      console.error(`[Webhook] Rejected unsafe URL: ${targetUrl}`);
      return;
    }

    const jsonBody = JSON.stringify({
      event,
      timestamp: new Date().toISOString(),
      data: payload
    });

    const signature = crypto.createHmac('sha256', secret).update(jsonBody).digest('hex');

    const opts = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-InboxOS-Signature': `sha256=${signature}`
      },
      body: jsonBody
    };

    dispatchWithRetry(targetUrl, opts).catch(() => {});
  }
}
