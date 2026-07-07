'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, Clock, AlertTriangle, BarChart2, Wifi, WifiOff } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { pipelineApi, analyticsApi } from '@/lib/api';

const AGENTS = [
  { id: 'r', letter: 'R', name: 'Retrieval Agent', description: 'Query classification & language detection', gradient: 'linear-gradient(135deg, #004A8F, #0062B8)' },
  { id: 'c', letter: 'C', name: 'Classification Agent', description: 'Intent routing & department matching', gradient: 'linear-gradient(135deg, #0891B2, #0E7490)' },
  { id: 'p', letter: 'P', name: 'Procedure Agent', description: 'Procedure retrieval & step generation', gradient: 'linear-gradient(135deg, #5B21B6, #7C3AED)' },
  { id: 'e', letter: 'E', name: 'Emergency Agent', description: 'Emergency detection & escalation', gradient: 'linear-gradient(135deg, #C62828, #E53935)' },
  { id: 'o', letter: 'O', name: 'Output Agent', description: 'Response formatting & multi-channel output', gradient: 'linear-gradient(135deg, #E8620A, #F47D2C)' },
];

const CHANNEL_COLORS: Record<string, string> = {
  web: '#004A8F', mobile: '#5B21B6', whatsapp: '#2E7D32', sms: '#0891B2',
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

export default function AIMonitorContent() {
  const { data: health, isError: healthError, isLoading: healthLoading } = useQuery({
    queryKey: ['pipeline-health'],
    queryFn: () => pipelineApi.health(),
    refetchInterval: 30_000,
    retry: 1,
  });

  const { data: recentQueries, isError: queriesError } = useQuery({
    queryKey: ['analytics-queries-recent'],
    queryFn: () => analyticsApi.queries({ limit: 10 }),
    refetchInterval: 30_000,
    retry: false,
  });

  const isOnline = !healthError && health?.status === 'ok';
  const queries = recentQueries?.items ?? recentQueries ?? [];

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <Activity size={22} className="text-foreground" />
          <div>
            <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>AI Monitor</h1>
            <p className="text-muted-foreground mt-0.5" style={{ fontSize: '14px' }}>Agent pipeline status</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {healthLoading ? (
            <span className="text-muted-foreground" style={{ fontSize: '12px' }}>Checking…</span>
          ) : isOnline ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-clinical-green-bg border border-clinical-green/30">
              <Wifi size={12} className="text-clinical-green" />
              <span className="text-clinical-green font-semibold" style={{ fontSize: '11px' }}>Pipeline Online · v{health?.version ?? '—'}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-clinical-red-bg border border-clinical-red/30">
              <WifiOff size={12} className="text-clinical-red" />
              <span className="text-clinical-red font-semibold" style={{ fontSize: '11px' }}>Pipeline Offline</span>
            </div>
          )}
        </div>
      </div>

      {/* Offline Banner */}
      {!healthLoading && !isOnline && (
        <div className="flex items-start gap-3 px-4 py-3 rounded-md bg-clinical-amber-bg border border-clinical-amber/40 mb-5">
          <AlertTriangle size={16} className="text-clinical-amber mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-clinical-amber" style={{ fontSize: '13px' }}>AI pipeline service unavailable</p>
            <p className="text-clinical-amber/80 mt-0.5" style={{ fontSize: '12px' }}>Start the pipeline service: <code className="font-mono">uvicorn agents.main:app --port 8020</code></p>
          </div>
        </div>
      )}

      {/* Agent Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-5">
        {AGENTS.map((agent) => (
          <div key={agent.id} className="bg-card rounded-md shadow-card p-4 hover:shadow-card-md transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0" style={{ background: agent.gradient, fontSize: '16px' }}>
                {agent.letter}
              </div>
              <Badge variant={isOnline ? 'active' : 'degraded'}>{isOnline ? 'Active' : 'Offline'}</Badge>
            </div>
            <p className="font-semibold text-foreground mb-0.5" style={{ fontSize: '15px' }}>{agent.name}</p>
            <p className="text-muted-foreground" style={{ fontSize: '12px' }}>{agent.description}</p>
            {!isOnline && (
              <p className="mt-3 text-muted-foreground/60 italic" style={{ fontSize: '11px' }}>Pipeline offline — no metrics available</p>
            )}
          </div>
        ))}
      </div>

      {/* Recent AI Activity */}
      <div className="bg-card rounded-md shadow-card overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
          <Clock size={15} className="text-muted-foreground" />
          <h3 className="font-semibold text-foreground" style={{ fontSize: '15px' }}>Recent AI Queries</h3>
        </div>
        {queriesError ? (
          <div className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: '13px' }}>
            Analytics service offline — start svc05 on port 8005
          </div>
        ) : queries.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground" style={{ fontSize: '13px' }}>
            No recent queries
          </div>
        ) : (
          <div>
            {queries.map((item: any, idx: number) => (
              <div key={item.id ?? idx} className={`flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-0 hover:bg-background transition-colors ${idx % 2 === 1 ? 'bg-background/40' : ''}`} style={{ minHeight: '40px' }}>
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ background: CHANNEL_COLORS[item.platform ?? 'web'] ?? '#004A8F', fontSize: '10px' }}
                >
                  {(item.platform ?? 'W')[0].toUpperCase()}
                </div>
                <span className="flex-1 truncate text-foreground" style={{ fontSize: '13px' }}>
                  {item.query ?? 'Query'}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-mono flex-shrink-0" style={{ fontSize: '11px' }}>
                  {item.intent ?? '—'}
                </span>
                <Badge variant={item.platform ?? 'web'}>{item.platform ?? 'web'}</Badge>
                <span className="text-muted-foreground flex-shrink-0" style={{ fontSize: '12px' }}>
                  {item.created_at ? formatRelative(item.created_at) : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
