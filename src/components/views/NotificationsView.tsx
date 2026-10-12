'use client';

import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Send, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Radio, 
  Trash2 
} from 'lucide-react';
import { NotificationItem } from '@/types';

export const NotificationsView: React.FC = () => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [testSent, setTestSent] = useState(false);

  const loadNotifications = () => {
    fetch('/api/notifications')
      .then(r => r.json())
      .then(d => {
        if (d.notifications) setNotifications(d.notifications);
      })
      .catch(console.error);
  };

  useEffect(() => {
    loadNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'mark_all_read' })
      });
      loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const handleTestWebhook = async () => {
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ test_webhook: true })
      });
      setTestSent(true);
      loadNotifications();
      setTimeout(() => setTestSent(false), 3000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            <span>Alerts & Notifications Feed</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Audit logs of proxy recovery transitions, outage notifications, and quarantine triggers.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestWebhook}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#131d35] hover:bg-[#172342] border border-[#1e2d54] text-slate-200 text-xs font-semibold transition-all"
          >
            <Send className="w-3.5 h-3.5 text-cyan-400" />
            <span>{testSent ? 'Dispatched!' : 'Send Test Alert'}</span>
          </button>
          <button
            onClick={handleMarkAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-glow-sm transition-all"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span>Mark All as Read</span>
          </button>
        </div>
      </div>

      <div className="space-y-2.5">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-slate-400 bg-[#0d1424] rounded-xl border border-[#1a2540]">
            No notifications recorded yet.
          </div>
        ) : (
          notifications.map((n) => {
            const isRecovered = n.type === 'proxy_recovered';
            const isFailed = n.type === 'proxy_failed';
            return (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition-all text-xs flex items-start justify-between gap-4 ${
                  !n.is_read
                    ? 'bg-[#131d35] border-blue-500/40'
                    : 'bg-[#0d1424] border-[#1a2540]'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                    isRecovered ? 'bg-emerald-500/20 text-emerald-400' :
                    isFailed ? 'bg-rose-500/20 text-rose-400' :
                    'bg-amber-500/20 text-amber-400'
                  }`}>
                    {isRecovered ? <CheckCircle2 className="w-4 h-4" /> :
                     isFailed ? <Clock className="w-4 h-4" /> :
                     <AlertTriangle className="w-4 h-4" />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-white">{n.title}</h4>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {n.channel}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-mono whitespace-pre-line">
                      {n.message}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-[11px] text-slate-500 font-mono block">
                    {new Date(n.created_at).toLocaleTimeString()}
                  </span>
                  {!n.is_read && (
                    <span className="inline-block w-2 h-2 rounded-full bg-blue-500 mt-1"></span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
