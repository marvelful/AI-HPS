'use client';
import React from 'react';
import { Clock, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '@/lib/api';

const ACTION_COLORS: Record<string, { bg: string; dot: string }> = {
  login: { bg: '#E8F0FA', dot: '#004A8F' },
  logout: { bg: '#F3E8FF', dot: '#5B21B6' },
  procedure_view: { bg: '#E8F0FA', dot: '#004A8F' },
  procedure_edit: { bg: '#FEF0E6', dot: '#E8620A' },
  approval: { bg: '#FFF3E0', dot: '#E65100' },
  user_create: { bg: '#E8F5E9', dot: '#2E7D32' },
  ai_query: { bg: '#F3E8FF', dot: '#5B21B6' },
  emergency: { bg: '#FFEBEE', dot: '#C62828' },
};

function formatRelative(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function eventDescription(eventType: string, meta: any): string {
  const t = eventType?.toLowerCase() ?? '';
  const user = meta?.user_name ?? meta?.full_name ?? '';
  if (t.includes('login')) return user ? `Sign-in: ${user}` : 'User signed in';
  if (t.includes('logout')) return user ? `Sign-out: ${user}` : 'User signed out';
  if (t.includes('procedure') && t.includes('creat')) return `Procedure created`;
  if (t.includes('procedure') && t.includes('updat')) return `Procedure updated`;
  if (t.includes('procedure') && t.includes('approv')) return `Procedure approved`;
  if (t.includes('approv')) return `Approval action`;
  if (t.includes('query') || t.includes('pipeline')) return `AI query processed`;
  if (t.includes('emergency')) return `Emergency query detected`;
  if (t.includes('user')) return `User management action`;
  return eventType?.replace(/\./g, ' ') ?? 'System event';
}

function actionKey(eventType: string): string {
  const t = eventType?.toLowerCase() ?? '';
  if (t.includes('login') && !t.includes('logout')) return 'login';
  if (t.includes('logout')) return 'logout';
  if (t.includes('procedure')) return 'procedure_edit';
  if (t.includes('approv')) return 'approval';
  if (t.includes('user')) return 'user_create';
  if (t.includes('query') || t.includes('pipeline')) return 'ai_query';
  if (t.includes('emergency')) return 'emergency';
  return 'procedure_view';
}

export default function DashboardActivityFeed() {
  const { data, isError } = useQuery({
    queryKey: ['audit-recent'],
    queryFn: () => auditApi.list({ limit: 8 }),
    retry: false,
    staleTime: 30_000,
  });

  const events = data?.items ?? [];

  return (
    <div className="bg-card rounded-md shadow-card border border-border h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground" style={{ fontSize: '15px' }}>Recent Activity</h2>
        <Clock size={15} className="text-muted-foreground" />
      </div>

      {isError ? (
        <div className="flex flex-col items-center gap-2 py-10 px-5 text-center">
          <Activity size={28} className="text-muted-foreground/30" />
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>Audit service offline</p>
          <p className="text-muted-foreground/60" style={{ fontSize: '11px' }}>Start svc06 on port 8006 to see activity</p>
        </div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 px-5 text-center">
          <Activity size={28} className="text-muted-foreground/30" />
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>No recent activity</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {events.map((evt) => {
            const key = actionKey(evt.event_type);
            const colors = ACTION_COLORS[key] ?? ACTION_COLORS.procedure_view;
            const meta = evt.event_metadata ?? {};
            return (
              <div key={evt.id} className="flex items-start gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5" style={{ backgroundColor: colors.bg }}>
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.dot }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground leading-snug" style={{ fontSize: '13px' }}>
                    {eventDescription(evt.event_type, meta)}
                  </p>
                </div>
                <span className="text-muted-foreground flex-shrink-0 whitespace-nowrap" style={{ fontSize: '11px' }}>
                  {formatRelative(evt.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
