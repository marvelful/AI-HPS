'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from '@/components/ui/KPICard';
import { Sparkles, Target, Zap, AlertTriangle } from 'lucide-react';
import { analyticsApi } from '@/lib/api';

function KPISkeleton() {
  return (
    <div className="bg-card rounded-md shadow-card border border-border p-4 flex flex-col gap-3">
      <div className="h-4 w-24 bg-muted rounded animate-pulse" />
      <div className="h-8 w-20 bg-muted rounded animate-pulse" />
      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
    </div>
  );
}

export default function AnalyticsKPIs() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsApi.summary(),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <KPISkeleton key={`kpi-skel-${i}`} />)}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          { id: 'kpi-q', title: 'Total Queries', value: '—', trend: 'Analytics unavailable', trendPositive: false, accentColor: '#5B21B6', icon: <Sparkles size={16} /> },
          { id: 'kpi-m', title: 'Procedures Matched', value: '—', trend: 'Analytics unavailable', trendPositive: false, accentColor: '#2E7D32', icon: <Target size={16} /> },
          { id: 'kpi-r', title: 'Avg Response Time', value: '—', trend: 'Analytics unavailable', trendPositive: false, accentColor: '#004A8F', icon: <Zap size={16} /> },
          { id: 'kpi-g', title: 'Content Gaps', value: '—', trend: 'Analytics unavailable', trendPositive: false, accentColor: '#C62828', icon: <AlertTriangle size={16} /> },
        ].map((kpi) => <KPICard key={kpi.id} {...kpi} />)}
      </div>
    );
  }

  const successPct = data.success_rate_pct != null ? `${data.success_rate_pct.toFixed(1)}%` : '—';
  const avgRespSec = data.avg_response_ms != null ? `${(data.avg_response_ms / 1000).toFixed(1)}s` : '—';
  const topPlatform = data.top_platforms ? Object.entries(data.top_platforms).sort((a, b) => b[1] - a[1])[0]?.[0] : null;

  const kpis = [
    {
      id: 'analytics-kpi-queries',
      title: 'Total Queries',
      value: data.total_queries?.toLocaleString() ?? '—',
      trend: topPlatform ? `Top platform: ${topPlatform}` : null,
      trendPositive: true,
      accentColor: '#5B21B6',
      icon: <Sparkles size={16} />,
    },
    {
      id: 'analytics-kpi-match',
      title: 'AI Success Rate',
      value: successPct,
      trend: 'RAG answer rate',
      trendPositive: (data.success_rate_pct ?? 0) >= 80,
      accentColor: '#2E7D32',
      icon: <Target size={16} />,
    },
    {
      id: 'analytics-kpi-response',
      title: 'Avg Response Time',
      value: avgRespSec,
      trend: 'Pipeline latency',
      trendPositive: (data.avg_response_ms ?? 0) < 3000,
      accentColor: '#004A8F',
      icon: <Zap size={16} />,
    },
    {
      id: 'analytics-kpi-successful',
      title: 'Successful Queries',
      value: data.successful_queries ?? 0,
      trend: null,
      trendPositive: true,
      accentColor: '#C62828',
      icon: <AlertTriangle size={16} />,
    },
  ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {kpis.map((kpi) => <KPICard key={kpi.id} {...kpi} />)}
    </div>
  );
}
