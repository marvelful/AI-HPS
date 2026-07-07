'use client';
import React, { useState, useMemo } from 'react';
import { Bell, FileText, RefreshCw } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { proceduresApi, type Procedure } from '@/lib/api';

type NotifType = 'published' | 'pending' | 'updated';
type TabKey = 'all' | 'unread' | 'published';

interface Notification {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  timestamp: string;
  read: boolean;
  badge: string;
  docUrl?: string | null;
}

const dotColors: Record<NotifType, string> = {
  published: '#2E7D32',
  pending: '#E8620A',
  updated: '#004A8F',
};

const badgeColors: Record<string, string> = {
  PUBLISHED: '#2E7D32',
  PENDING: '#E8620A',
  UPDATED: '#004A8F',
};

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    const days = Math.floor(diffMs / 86_400_000);
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function buildNotifications(procedures: Procedure[]): Notification[] {
  const now = Date.now();
  return procedures.map((proc): Notification => {
    const isPending = proc.status === 'pending';
    const dateStr = proc.published_at ?? proc.updated_at ?? proc.created_at;
    const diffMs = now - new Date(dateStr).getTime();
    const isRecent = diffMs < 24 * 3_600_000;

    return {
      id: `notif-${proc.id}`,
      type: isPending ? 'pending' : 'published',
      title: isPending ? 'Procedure Pending Approval' : 'Procedure Published',
      body: isPending
        ? `"${proc.title}" is awaiting approval — v${proc.version}`
        : `"${proc.title}" v${proc.version} was published`,
      timestamp: formatRelative(dateStr),
      read: !isRecent,
      badge: isPending ? 'PENDING' : 'PUBLISHED',
      docUrl: proc.document_url,
    };
  });
}

export default function NotificationsContent() {
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<TabKey>('all');

  const { data: publishedData, isLoading: loadingPub, refetch: refetchPub } = useQuery({
    queryKey: ['notifs-published'],
    queryFn: () => proceduresApi.list({ status: 'published', limit: 20 }),
    refetchInterval: 60_000,
  });

  const { data: pendingData, isLoading: loadingPend } = useQuery({
    queryKey: ['notifs-pending'],
    queryFn: () => proceduresApi.list({ status: 'pending', limit: 20 }),
    refetchInterval: 60_000,
  });

  const isLoading = loadingPub || loadingPend;

  const notifications: Notification[] = useMemo(() => {
    const published = buildNotifications(publishedData?.items ?? []);
    const pending = buildNotifications(pendingData?.items ?? []);
    return [...pending, ...published].map((n) => ({ ...n, read: n.read || readIds.has(n.id) }));
  }, [publishedData, pendingData, readIds]);

  const unreadCount = notifications.filter((n) => !n.read).length;
  const publishedCount = notifications.filter((n) => n.type === 'published').length;

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: notifications.length },
    { key: 'unread', label: 'Unread', count: unreadCount },
    { key: 'published', label: 'Published', count: publishedCount },
  ];

  const filtered = notifications.filter((n) => {
    if (activeTab === 'unread') return !n.read;
    if (activeTab === 'published') return n.type === 'published';
    return true;
  });

  const markRead = (id: string) => setReadIds((prev) => new Set(prev).add(id));
  const markAllRead = () => setReadIds(new Set(notifications.map((n) => n.id)));

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Bell size={22} className="text-foreground" />
          <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>Notifications</h1>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="px-3 py-1.5 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium"
              style={{ fontSize: '13px' }}
            >
              Mark all read
            </button>
          )}
          <button
            onClick={() => refetchPub()}
            disabled={isLoading}
            className="p-1.5 rounded-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-border mb-4">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-1.5 px-4 py-2.5 font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key ? 'text-primary border-primary' : 'text-muted-foreground border-transparent hover:text-foreground'
            }`}
            style={{ fontSize: '14px' }}
          >
            {tab.label}
            <span className={`px-1.5 py-0.5 rounded-full font-semibold ${activeTab === tab.key ? 'bg-primary-light text-primary' : 'bg-muted text-muted-foreground'}`} style={{ fontSize: '11px' }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((i) => (
            <div key={`nskel-${i}`} className="flex items-start gap-3 px-4 py-3 rounded-md bg-card border border-border animate-pulse">
              <div className="w-2.5 h-2.5 mt-1.5 rounded-full bg-muted flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="h-4 w-2/5 bg-muted rounded" />
                <div className="h-3 w-3/4 bg-muted rounded" />
              </div>
              <div className="w-16 h-4 bg-muted rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Notification List */}
      {!isLoading && (
        <div className="flex flex-col gap-2">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <Bell size={40} className="text-muted-foreground/40" />
              <p className="font-semibold text-foreground" style={{ fontSize: '16px' }}>No notifications</p>
              <p className="text-muted-foreground" style={{ fontSize: '14px' }}>You&apos;re all caught up!</p>
            </div>
          ) : (
            filtered.map((notif) => (
              <div
                key={notif.id}
                onClick={() => markRead(notif.id)}
                className={`flex items-start gap-3 px-4 py-3 rounded-md shadow-card cursor-pointer hover:shadow-card-md transition-shadow ${
                  !notif.read ? 'bg-white border-l-[3px] border-primary' : 'bg-card'
                }`}
              >
                <div className="mt-1.5 flex-shrink-0">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: dotColors[notif.type] }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`${!notif.read ? 'font-bold' : 'font-semibold'} text-foreground`} style={{ fontSize: '14px' }}>{notif.title}</p>
                  <p className="text-muted-foreground mt-0.5 line-clamp-2" style={{ fontSize: '13px' }}>{notif.body}</p>
                  {notif.docUrl && (
                    <a
                      href={notif.docUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="flex items-center gap-1 mt-1 text-primary hover:underline"
                      style={{ fontSize: '12px' }}
                    >
                      <FileText size={11} /> View PDF
                    </a>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                  <span
                    className="px-2 py-0.5 rounded-full text-white font-semibold"
                    style={{ backgroundColor: badgeColors[notif.badge] ?? '#004A8F', fontSize: '10px' }}
                  >
                    {notif.badge}
                  </span>
                  <span className="text-muted-foreground" style={{ fontSize: '11px' }}>{notif.timestamp}</span>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </>
  );
}
