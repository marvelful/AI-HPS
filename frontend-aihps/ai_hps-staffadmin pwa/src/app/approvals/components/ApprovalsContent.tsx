'use client';
import React, { useState } from 'react';
import { CheckCircle, X, Check, Clock, RefreshCw, FileText } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { toast } from 'sonner';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { proceduresApi, type Procedure } from '@/lib/api';

function formatRelative(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diffMs / 60_000);
    const hours = Math.floor(diffMs / 3_600_000);
    const days = Math.floor(diffMs / 86_400_000);
    if (mins < 60) return `${mins} min ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days === 1) return '1 day ago';
    if (days < 7) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch { return '—'; }
}

function getRiskBadge(level: string) {
  const map: Record<string, string> = { critical: 'bg-clinical-red-bg text-clinical-red', high: 'bg-red-50 text-red-700', medium: 'bg-amber-50 text-amber-700', low: 'bg-green-50 text-green-700' };
  return map[level?.toLowerCase()] ?? 'bg-muted text-muted-foreground';
}

export default function ApprovalsContent() {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<string | null>(null);
  const [comment, setComment] = useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['approvals-pending'],
    queryFn: () => proceduresApi.list({ status: 'pending', limit: 50 }),
    refetchInterval: 30_000,
  });

  const pending: Procedure[] = data?.items ?? [];

  const handleApprove = async (proc: Procedure) => {
    setProcessing(proc.id + '-approve');
    try {
      await proceduresApi.approve(proc.id, 'approved', comment[proc.id] || undefined);
      toast.success(`"${proc.title}" approved successfully.`);
      queryClient.invalidateQueries({ queryKey: ['approvals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Approve failed';
      toast.error(typeof detail === 'string' ? detail : 'Failed to approve procedure.');
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (proc: Procedure) => {
    setProcessing(proc.id + '-reject');
    try {
      await proceduresApi.approve(proc.id, 'rejected', comment[proc.id] || undefined);
      toast.error(`"${proc.title}" rejected and returned to author.`);
      queryClient.invalidateQueries({ queryKey: ['approvals-pending'] });
      queryClient.invalidateQueries({ queryKey: ['procedures'] });
    } catch (err: any) {
      const detail = err?.response?.data?.detail ?? 'Reject failed';
      toast.error(typeof detail === 'string' ? detail : 'Failed to reject procedure.');
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>Approval Queue</h1>
          {!isLoading && (
            <Badge variant="amber">{pending.length} pending</Badge>
          )}
        </div>
        <button
          onClick={() => refetch()}
          disabled={isLoading}
          className="flex items-center gap-2 px-3 py-2 rounded-sm border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          style={{ fontSize: '13px' }}
        >
          <RefreshCw size={13} className={isLoading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map((i) => (
            <div key={`skel-${i}`} className="bg-card rounded-md border border-border p-5" style={{ borderLeft: '4px solid #CBD5E1' }}>
              <div className="h-5 w-3/5 bg-muted rounded animate-pulse mb-3" />
              <div className="h-4 w-2/5 bg-muted rounded animate-pulse mb-4" />
              <div className="h-3 w-full bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="bg-card rounded-md border border-border flex flex-col items-center justify-center py-16 text-center">
          <X size={40} className="text-clinical-red mb-3" />
          <p className="font-semibold text-foreground mb-2" style={{ fontSize: '16px' }}>Failed to load approval queue</p>
          <p className="text-muted-foreground mb-4" style={{ fontSize: '13px' }}>Could not reach the procedures service. Check that svc03 is running.</p>
          <button onClick={() => refetch()} className="px-4 py-2 rounded-sm bg-primary text-white font-medium hover:bg-primary-hover transition-colors" style={{ fontSize: '13px' }}>
            Try again
          </button>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && pending.length === 0 && (
        <div className="bg-card rounded-md shadow-card border border-border flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle size={52} className="text-clinical-green mb-4" />
          <h2 className="font-bold text-foreground mb-1" style={{ fontSize: '20px' }}>All caught up!</h2>
          <p className="text-muted-foreground" style={{ fontSize: '14px' }}>No procedures are pending approval right now.</p>
        </div>
      )}

      {/* Cards */}
      {!isLoading && !isError && pending.length > 0 && (
        <div className="flex flex-col gap-4">
          {pending.map((proc) => {
            const isProcessing = processing?.startsWith(proc.id);
            return (
              <div key={proc.id} className="bg-card rounded-md shadow-card border border-border p-5" style={{ borderLeft: '4px solid #E65100' }}>
                {/* Top row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="font-bold text-foreground" style={{ fontSize: '17px' }}>{proc.title}</h2>
                    <span className="font-mono-clinical text-muted-foreground px-2 py-0.5 rounded-sm bg-muted" style={{ fontSize: '11px' }}>v{proc.version}</span>
                    <Badge variant="pending">PENDING APPROVAL</Badge>
                    <span className={`px-2 py-0.5 rounded-full font-semibold text-[11px] ${getRiskBadge(proc.risk_level)}`}>
                      {proc.risk_level?.toUpperCase() ?? '—'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleReject(proc)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm border border-clinical-red text-clinical-red hover:bg-clinical-red-bg disabled:opacity-50 transition-all duration-150 active:scale-95"
                      style={{ fontSize: '13px' }}
                    >
                      {processing === proc.id + '-reject' ? (
                        <div className="w-3 h-3 border-2 border-clinical-red border-t-transparent rounded-full animate-spin" />
                      ) : <X size={13} />}
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(proc)}
                      disabled={isProcessing}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm bg-clinical-green text-white hover:opacity-90 disabled:opacity-50 transition-all duration-150 active:scale-95"
                      style={{ fontSize: '13px' }}
                    >
                      {processing === proc.id + '-approve' ? (
                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : <Check size={13} />}
                      Approve
                    </button>
                  </div>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3 text-muted-foreground" style={{ fontSize: '13px' }}>
                  <span className="flex items-center gap-1">
                    <Clock size={12} /> {formatRelative(proc.created_at)}
                  </span>
                  {proc.stream_target && (
                    <span>Stream: <span className="font-medium text-foreground">{proc.stream_target === 'B' ? 'Staff Only' : proc.stream_target === 'A' ? 'Patient' : 'Both'}</span></span>
                  )}
                  {proc.language && (
                    <span>Language: <span className="font-medium text-foreground">{proc.language}</span></span>
                  )}
                  {proc.document_url && (
                    <a href={proc.document_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <FileText size={12} /> View PDF
                    </a>
                  )}
                </div>

                {proc.summary && (
                  <p className="text-muted-foreground mb-3 line-clamp-2" style={{ fontSize: '13px' }}>{proc.summary}</p>
                )}

                {/* Optional comment */}
                <div className="border-t border-border pt-3 mt-2">
                  <input
                    type="text"
                    value={comment[proc.id] ?? ''}
                    onChange={(e) => setComment((prev) => ({ ...prev, [proc.id]: e.target.value }))}
                    placeholder="Add a comment (optional)…"
                    className="w-full px-3 py-2 border border-border rounded-sm bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ fontSize: '12px' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
