'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BookOpen } from 'lucide-react';
import { proceduresApi, type Procedure } from '@/lib/api';

function getRiskColor(level: string): string {
  switch (level?.toLowerCase()) {
    case 'critical': return '#C62828';
    case 'high': return '#E65100';
    case 'medium': return '#E8620A';
    case 'low': return '#2E7D32';
    default: return '#6B7280';
  }
}

export default function AnalyticsTopProcedures() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-top-procedures'],
    queryFn: () => proceduresApi.list({ status: 'published', limit: 8 }),
  });

  const procedures: Procedure[] = data?.items ?? [];

  return (
    <div className="bg-card rounded-md shadow-card border border-border h-full">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground" style={{ fontSize: '15px' }}>Published Procedures</h2>
      </div>

      {isLoading && (
        <div className="divide-y divide-border">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={`skel-${i}`} className="flex items-center gap-3 px-5 py-3">
              <div className="w-6 h-6 rounded-full bg-muted animate-pulse flex-shrink-0" />
              <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
              <div className="w-16 h-4 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
          <BookOpen size={32} className="text-muted-foreground/40" />
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>Could not load procedures.</p>
        </div>
      )}

      {!isLoading && !isError && procedures.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
          <BookOpen size={32} className="text-muted-foreground/40" />
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>No published procedures yet.</p>
        </div>
      )}

      {!isLoading && !isError && procedures.length > 0 && (
        <div className="divide-y divide-border">
          {procedures.map((proc, idx) => (
            <div key={proc.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/30 transition-colors">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-semibold flex-shrink-0" style={{ fontSize: '11px' }}>
                {idx + 1}
              </div>
              <p className="flex-1 text-foreground truncate" style={{ fontSize: '13px' }}>{proc.title}</p>
              <span className="text-xs font-semibold flex-shrink-0" style={{ color: getRiskColor(proc.risk_level) }}>
                {proc.risk_level?.toUpperCase() ?? '—'}
              </span>
              <span className="font-mono text-muted-foreground flex-shrink-0" style={{ fontSize: '11px' }}>v{proc.version}</span>
            </div>
          ))}
        </div>
      )}

      <div className="px-5 py-3 border-t border-border">
        <p className="text-muted-foreground" style={{ fontSize: '11px' }}>
          {data?.total != null ? `${data.total} total published` : 'All streams'}
        </p>
      </div>
    </div>
  );
}
