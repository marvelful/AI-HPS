'use client';
import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import Badge from '@/components/ui/Badge';
import RiskDot from '@/components/ui/RiskDot';
import EmptyState from '@/components/ui/EmptyState';
import { proceduresApi, type Procedure } from '@/lib/api';

function mapStreamTarget(streamTarget: string): 'staff-only' | 'patient' | 'both' {
  if (streamTarget === 'B') return 'staff-only';
  if (streamTarget === 'A') return 'patient';
  return 'both';
}

function mapRiskLevel(riskLevel: string): 'critical' | 'high' | 'medium' | 'low' {
  const r = riskLevel?.toLowerCase();
  if (r === 'critical') return 'critical';
  if (r === 'high') return 'high';
  if (r === 'low') return 'low';
  return 'medium';
}

function mapStatus(status: string): 'draft' | 'pending' | 'published' | 'archived' {
  const s = status?.toLowerCase();
  if (s === 'draft') return 'draft';
  if (s === 'pending' || s === 'pending_approval') return 'pending';
  if (s === 'published') return 'published';
  if (s === 'archived') return 'archived';
  return 'draft';
}

function formatRelativeTime(dateStr: string): string {
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const diffMins = Math.floor(diffMs / 60_000);
    const diffHours = Math.floor(diffMs / 3_600_000);
    const diffDays = Math.floor(diffMs / 86_400_000);
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 14) return '1 week ago';
    return `${Math.floor(diffDays / 7)} weeks ago`;
  } catch {
    return dateStr;
  }
}

export default function DashboardRecentProcedures() {
  const { data: proceduresData, isLoading, error } = useQuery({
    queryKey: ['procedures-recent'],
    queryFn: () => proceduresApi.list({ limit: 5, status: 'published' }),
    staleTime: 60_000,
  });

  const procedures = (proceduresData?.items ?? [])
    .slice(0, 5)
    .map((p: Procedure) => ({
        id: p.id,
        title: p.title,
        summary: p.summary ?? '',
        department: p.department_id ?? '—',
        stream: mapStreamTarget(p.stream_target),
        risk: mapRiskLevel(p.risk_level),
        status: mapStatus(p.status),
        updated: formatRelativeTime(p.updated_at),
      }));

  return (
    <div className="bg-card rounded-md shadow-card border border-border overflow-hidden h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <h2 className="font-semibold text-foreground" style={{ fontSize: '15px' }}>Recent Procedures</h2>
        <Link href="/procedures" className="text-primary hover:text-primary-hover font-medium transition-colors" style={{ fontSize: '13px' }}>
          View all →
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              {['Procedure', 'Dept', 'Stream', 'Risk', 'Status', 'Updated', 'Actions'].map((col) => (
                <th key={`proc-col-${col}`} className="px-4 py-2.5 text-left label-meta text-muted-foreground whitespace-nowrap">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={`recent-proc-loading-${idx}`} className="border-b border-border last:border-0">
                  {Array.from({ length: 7 }).map((__, col) => (
                    <td key={`recent-proc-loading-${idx}-${col}`} className="px-4 py-3">
                      <div className="h-4 rounded bg-muted animate-pulse" style={{ width: col === 0 ? 180 : 80 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-clinical-red" style={{ fontSize: '14px' }}>
                  Failed to load recent procedures.
                </td>
              </tr>
            ) : procedures.length === 0 ? (
              <tr>
                <td colSpan={7}>
                  <EmptyState
                    icon={<span className="text-3xl">+</span>}
                    title="No recent procedures"
                    description="Published procedures will appear here after the knowledge base is loaded."
                  />
                </td>
              </tr>
            ) : procedures.map((proc, idx) => (
              <tr
                key={proc.id}
                className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors cursor-pointer"
                style={{ backgroundColor: idx % 2 === 1 ? '#F8FAFF' : undefined }}
              >
                <td className="px-4 py-3 min-w-[200px]">
                  <div className="flex items-start gap-2">
                    <RiskDot level={proc.risk} className="mt-1.5" />
                    <div>
                      <p className="font-semibold text-foreground" style={{ fontSize: '13px' }}>{proc.title}</p>
                      <p className="text-muted-foreground truncate max-w-[180px]" style={{ fontSize: '11px' }}>{proc.summary}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground" style={{ fontSize: '13px' }}>{proc.department}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant={proc.stream}>{proc.stream === 'staff-only' ? 'Staff Only' : proc.stream === 'both' ? 'Both' : 'Patient'}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant={proc.risk}>{proc.risk.charAt(0).toUpperCase() + proc.risk.slice(1)}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <Badge variant={proc.status}>{proc.status.charAt(0).toUpperCase() + proc.status.slice(1)}</Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground" style={{ fontSize: '12px' }}>{proc.updated}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <button className="text-primary hover:underline font-medium" style={{ fontSize: '12px' }}>View</button>
                    <button className="text-muted-foreground hover:text-foreground" style={{ fontSize: '12px' }}>Edit</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-5 py-3 border-t border-border">
        <Link href="/procedures" className="text-primary hover:text-primary-hover text-sm font-medium transition-colors">
          View all procedures →
        </Link>
      </div>
    </div>
  );
}
