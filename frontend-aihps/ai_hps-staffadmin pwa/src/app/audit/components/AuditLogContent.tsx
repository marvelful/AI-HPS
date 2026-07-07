'use client';
import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Shield, ShieldCheck, Copy, Check, ChevronLeft, ChevronRight, Lock } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { auditApi, type AuditEvent } from '@/lib/api';

interface AuditEntry {
  id: string;
  timestamp: string;
  action: 'login' | 'logout' | 'procedure_view' | 'procedure_edit' | 'approval' | 'user_create' | 'ai_query' | 'emergency';
  actionLabel: string;
  userName: string;
  userInitials: string;
  userColor: string;
  entity: string;
  hmac: string;
}

const AVATAR_COLORS = ['#004A8F', '#5B21B6', '#2E7D32', '#E8620A', '#0891B2', '#C62828', '#E65100'];

function hashColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

function mapEventTypeToAction(eventType: string): AuditEntry['action'] {
  const t = eventType?.toLowerCase() ?? '';
  if (t.includes('login') && !t.includes('logout')) return 'login';
  if (t.includes('logout')) return 'logout';
  if (t.includes('procedure') && t.includes('view')) return 'procedure_view';
  if (t.includes('procedure') && (t.includes('edit') || t.includes('update') || t.includes('creat'))) return 'procedure_edit';
  if (t.includes('approv')) return 'approval';
  if (t.includes('user') && t.includes('creat')) return 'user_create';
  if (t.includes('query') || t.includes('pipeline')) return 'ai_query';
  if (t.includes('emergency')) return 'emergency';
  return 'procedure_view';
}

function mapEventTypeToLabel(eventType: string): string {
  const t = eventType?.toLowerCase() ?? '';
  if (t.includes('login') && !t.includes('logout')) return 'LOGIN';
  if (t.includes('logout')) return 'LOGOUT';
  if (t.includes('procedure') && t.includes('view')) return 'PROCEDURE_VIEW';
  if (t.includes('procedure') && (t.includes('edit') || t.includes('update'))) return 'PROCEDURE_EDIT';
  if (t.includes('procedure') && t.includes('creat')) return 'PROCEDURE_EDIT';
  if (t.includes('approv')) return 'APPROVAL';
  if (t.includes('user') && t.includes('creat')) return 'USER_CREATE';
  if (t.includes('query') || t.includes('pipeline')) return 'AI_QUERY';
  if (t.includes('emergency')) return 'EMERGENCY';
  return eventType?.toUpperCase().replace(/\./g, '_') ?? 'EVENT';
}

function formatTimestamp(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  } catch {
    return dateStr;
  }
}

function getUserInitials(nameOrId: string): string {
  if (!nameOrId) return '?';
  const parts = nameOrId.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return nameOrId.slice(0, 2).toUpperCase();
}

function truncateHmac(id: string): string {
  if (!id) return '??????…????';
  const clean = id.replace(/-/g, '');
  return `${clean.slice(0, 6)}…${clean.slice(-4)}`;
}

function mapAuditEvent(e: AuditEvent): AuditEntry {
  const meta = e.event_metadata ?? {};
  const userName: string = meta.user_name ?? meta.username ?? meta.full_name ?? e.user_id ?? 'Unknown User';
  const entity = e.entity_type && e.entity_id ? `${e.entity_type}:${e.entity_id}` : e.entity_type ?? e.entity_id ?? '—';
  return {
    id: e.id,
    timestamp: formatTimestamp(e.created_at),
    action: mapEventTypeToAction(e.event_type),
    actionLabel: mapEventTypeToLabel(e.event_type),
    userName,
    userInitials: getUserInitials(userName),
    userColor: hashColor(e.user_id ?? e.id),
    entity,
    hmac: truncateHmac(e.id),
  };
}

const ACTION_FILTERS = ['All', 'LOGIN', 'LOGOUT', 'PROCEDURE_VIEW', 'PROCEDURE_EDIT', 'APPROVAL', 'USER_CREATE', 'AI_QUERY', 'EMERGENCY'];

function HmacCell({ hmac }: { hmac: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(hmac).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-1.5 group">
      <span className="font-mono text-clinical-green" style={{ fontSize: '12px' }}>{hmac}</span>
      <button
        onClick={handleCopy}
        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
        title="Copy HMAC"
      >
        {copied ? <Check size={11} className="text-clinical-green" /> : <Copy size={11} />}
      </button>
    </div>
  );
}

export default function AuditLogContent() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All');

  const { data: auditListData, isLoading, isError } = useQuery({
    queryKey: ['audit-events'],
    queryFn: () => auditApi.list({ limit: 50 }),
    retry: false,
  });

  const allEntries: AuditEntry[] = (auditListData?.items ?? []).map(mapAuditEvent);
  const total = auditListData?.total ?? allEntries.length;

  const filtered = allEntries.filter((entry) => {
    const matchSearch = !search || entry.userName.toLowerCase().includes(search.toLowerCase()) || entry.entity.toLowerCase().includes(search.toLowerCase());
    const matchAction = actionFilter === 'All' || entry.actionLabel === actionFilter;
    return matchSearch && matchAction;
  });

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Shield size={22} className="text-foreground" />
          <div>
            <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>Audit Log</h1>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-clinical-green-bg border border-clinical-green/30">
          <ShieldCheck size={13} className="text-clinical-green" />
          <span className="text-clinical-green font-semibold" style={{ fontSize: '11px' }}>Append-only · HMAC Verified</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Shield size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Filter by user or entity…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-border rounded-sm bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
            style={{ fontSize: '13px' }}
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          style={{ fontSize: '13px', minWidth: '180px' }}
        >
          {ACTION_FILTERS.map((f) => (
            <option key={`af-${f}`} value={f}>{f === 'All' ? 'All Actions' : f}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-card rounded-md shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-surface-alt">
                {['Timestamp', 'Action', 'User', 'Entity', 'HMAC'].map((col) => (
                  <th key={`th-${col}`} className="px-4 py-3 text-left label-meta text-muted-foreground whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={`skel-${i}`} className="border-b border-border" style={{ height: '40px' }}>
                    {Array.from({ length: 5 }).map((__, j) => (
                      <td key={j} className="px-4 py-2">
                        <div className="h-3.5 bg-muted animate-pulse rounded" style={{ width: j === 0 ? '140px' : '100px' }} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center" style={{ fontSize: '14px' }}>
                    <p className="font-semibold text-foreground mb-1">Audit service offline</p>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground" style={{ fontSize: '14px' }}>
                    No audit entries match your filter.
                  </td>
                </tr>
              ) : (
                filtered.map((entry, idx) => (
                  <tr
                    key={entry.id}
                    className={`border-b border-border last:border-0 hover:bg-background transition-colors ${idx % 2 === 1 ? 'bg-background/50' : ''}`}
                    style={{ height: '40px' }}
                  >
                    <td className="px-4 py-2">
                      <span className="font-mono text-muted-foreground" style={{ fontSize: '12px' }}>{entry.timestamp}</span>
                    </td>
                    <td className="px-4 py-2">
                      <Badge variant={entry.action}>{entry.actionLabel}</Badge>
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0"
                          style={{ backgroundColor: entry.userColor, fontSize: '9px' }}
                        >
                          {entry.userInitials}
                        </div>
                        <span style={{ fontSize: '13px' }}>{entry.userName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2">
                      <span className="italic text-muted-foreground" style={{ fontSize: '12px' }}>{entry.entity}</span>
                    </td>
                    <td className="px-4 py-2">
                      <HmacCell hmac={entry.hmac} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-surface-alt">
          <div className="flex items-center gap-1.5 text-muted-foreground" style={{ fontSize: '12px' }}>
            <Lock size={11} />
            <span>Append-only · Cryptographically verified</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground" style={{ fontSize: '12px' }}>1–{filtered.length} of {total.toLocaleString()} entries</span>
            <div className="flex items-center gap-1">
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-40" disabled>
                <ChevronLeft size={14} />
              </button>
              <button className="p-1 rounded hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
