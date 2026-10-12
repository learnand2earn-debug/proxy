import { NextResponse } from 'next/server';
import { repo, DEFAULT_OWNER_ID } from '@/lib/db/repository';
import { dispatchNotification } from '@/lib/notifications/service';

export async function GET() {
  try {
    const notifications = repo.getNotifications(DEFAULT_OWNER_ID);
    const unreadCount = notifications.filter(n => !n.is_read).length;
    return NextResponse.json({ notifications, unreadCount });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, id, test_webhook = false } = body;

    if (test_webhook) {
      await dispatchNotification({
        owner_id: DEFAULT_OWNER_ID,
        title: 'Diagnostic Test Alert',
        message: 'This is a test notification from the AI Proxy Intelligence Platform.',
        type: 'system_alert'
      });
      return NextResponse.json({ success: true, message: 'Test notification dispatched' });
    }

    if (action === 'mark_all_read') {
      repo.markAllNotificationsRead(DEFAULT_OWNER_ID);
      return NextResponse.json({ success: true });
    }

    if (action === 'mark_read' && id) {
      repo.markNotificationRead(id);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid notification action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
