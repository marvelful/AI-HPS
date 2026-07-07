'use client';
import React from 'react';
import { AlertTriangle, Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { analyticsApi, type ContentGap } from '@/lib/api';

function formatRelative(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const hours = Math.floor(diffMs / 3_600_000);
    const days = Math.floor(diffMs / 86_400_000);
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

export default function AnalyticsContentGaps() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-content-gaps'],
    queryFn: () => analyticsApi.gaps({ limit: 20 }),
    refetchInterval: 120_000,
  });

  const gaps: ContentGap[] = Array.isArray(data) ? data : [];

  const handleCreate = (query: string) => {
    toast.info(`Opening procedure editor for: "${query.slice(0, 40)}…"`);
  };

  return (
    <div className="bg-card rounded-md shadow-card border border-border overflow-hidden" style={{ borderLeft: '4px solid #E65100' }}>
      <div className="px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <AlertTriangle size={17} className="text-clinical-amber" />
          <div>
            <h2 className="font-semibold text-foreground" style={{ fontSize: '15px' }}>Content Gaps</h2>
            <p className="text-muted-foreground" style={{ fontSize: '12px' }}>Unanswered Queries — No matching procedure found in the knowledge base</p>
          </div>
        </div>
      </div>

      {isLoading && (
        <div className="divide-y divide-border">
          {[1, 2, 3].map((i) => (
            <div key={`gskel-${i}`} className="flex items-center gap-4 px-5 py-3">
              <div className="flex-1 h-4 bg-muted rounded animate-pulse" />
              <div className="w-24 h-4 bg-muted rounded animate-pulse" />
              <div className="w-12 h-4 bg-muted rounded animate-pulse" />
              <div className="w-28 h-6 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
          <AlertTriangle size={32} className="text-clinical-amber" />
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>Could not load content gaps. Analytics service may be offline.</p>
        </div>
      )}

      {!isLoading && !isError && gaps.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-12 text-center px-4">
          <CheckCircle size={32} className="text-clinical-green" />
          <p className="font-semibold text-foreground" style={{ fontSize: '14px' }}>No content gaps detected!</p>
          <p className="text-muted-foreground" style={{ fontSize: '13px' }}>All recent queries were matched to procedures.</p>
        </div>
      )}

      {!isLoading && !isError && gaps.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {['Query Text', 'First Seen', 'Times Asked', 'Last Seen', 'Action'].map((col) => (
                  <th key={`gap-col-${col}`} className="px-5 py-2.5 text-left label-meta text-muted-foreground whitespace-nowrap">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {gaps.map((gap, idx) => (
                <tr
                  key={gap.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                  style={{ backgroundColor: idx % 2 === 1 ? '#F8FAFF' : undefined }}
                >
                  <td className="px-5 py-3">
                    <p className="text-foreground italic" style={{ fontSize: '13px' }}>"{gap.query}"</p>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground" style={{ fontSize: '13px' }}>
                    {formatRelative(gap.first_seen)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <span className="font-bold text-clinical-amber tabular-nums" style={{ fontSize: '14px' }}>{gap.occurrence_count}</span>
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap text-muted-foreground" style={{ fontSize: '12px' }}>
                    {formatRelative(gap.last_seen)}
                  </td>
                  <td className="px-5 py-3 whitespace-nowrap">
                    <button
                      onClick={() => handleCreate(gap.query)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-sm border border-primary text-primary hover:bg-primary-light transition-all duration-150 active:scale-95"
                      style={{ fontSize: '12px' }}
                    >
                      <Plus size={12} />
                      Create Procedure →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
