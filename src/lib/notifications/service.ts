import { repo, DEFAULT_OWNER_ID } from '../db/repository';
import { maskEndpoint } from '../validation/parser';

export interface DispatchNotificationOptions {
  owner_id?: string;
  title: string;
  message: string;
  type: 'proxy_recovered' | 'proxy_failed' | 'quarantined' | 'sync_failed' | 'system_alert';
  proxy_id?: string;
  endpoint?: string;
  latency_ms?: number;
  from_status?: string;
  to_status?: string;
}

export async function dispatchNotification(opts: DispatchNotificationOptions): Promise<void> {
  const owner_id = opts.owner_id || DEFAULT_OWNER_ID;
  const settings = repo.getSettings(owner_id);

  const masked = opts.endpoint ? maskEndpoint(opts.endpoint) : undefined;
  
  // Format message body
  let formattedMessage = opts.message;
  if (opts.from_status && opts.to_status && masked) {
    formattedMessage = `Proxy status changed: ${opts.from_status} -> ${opts.to_status}\n` +
      `Endpoint: ${masked}\n` +
      (opts.latency_ms ? `Latency: ${opts.latency_ms}ms\n` : '') +
      `Timestamp: ${new Date().toISOString()}`;
  }

  // 1. In-App Notification (Always stored)
  repo.addNotification({
    owner_id,
    title: opts.title,
    message: formattedMessage,
    channel: 'in_app',
    type: opts.type,
    proxy_id: opts.proxy_id
  });

  // 2. Discord Webhook Notification
  const discordUrl = settings.discord_webhook_url || process.env.DISCORD_WEBHOOK_URL;
  if (discordUrl && discordUrl.startsWith('https://discord.com/api/webhooks/')) {
    try {
      const color = opts.type === 'proxy_recovered' ? 0x10b981 // emerald
                  : opts.type === 'proxy_failed' ? 0xf43f5e     // rose
                  : opts.type === 'quarantined' ? 0xf59e0b      // amber
                  : 0x3b82f6;                                   // blue

      await fetch(discordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          embeds: [
            {
              title: `🔔 ${opts.title}`,
              description: formattedMessage,
              color,
              footer: { text: 'AI Proxy Intelligence & Monitoring Platform' },
              timestamp: new Date().toISOString()
            }
          ]
        })
      });
    } catch (err) {
      console.warn('Failed to dispatch Discord webhook:', err);
    }
  }

  // 3. Email Notification (if configured)
  if (settings.email_alerts_enabled && settings.alert_email_address) {
    // In production this connects to Resend, Sendgrid or SMTP
    // For local dev we log to audit log
    repo.addAuditLog({
      owner_id,
      action: 'EMAIL_NOTIFICATION_DISPATCHED',
      entity_type: 'NOTIFICATION',
      details: {
        to: settings.alert_email_address,
        title: opts.title,
        message: formattedMessage
      }
    });
  }
}
