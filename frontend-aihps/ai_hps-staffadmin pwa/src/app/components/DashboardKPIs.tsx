'use client';
import React from 'react';
import { useQuery } from '@tanstack/react-query';
import KPICard from '@/components/ui/KPICard';
import { ClipboardList, CheckSquare, Sparkles, TrendingUp, Building2 } from 'lucide-react';
import { analyticsApi, proceduresApi } from '@/lib/api';

export default function DashboardKPIs() {
  const { data: summary } = useQuery({
    queryKey: ['analytics-summary'],
    queryFn: () => analyticsApi.summary(),
    staleTime: 60_000,
  });

  const { data: proceduresData } = useQuery({
    queryKey: ['procedures-kpi'],
    queryFn: () => proceduresApi.list({ limit: 200 }),
    staleTime: 60_000,
  });

  const { data: departmentsData } = useQuery({
    queryKey: ['departments'],
    queryFn: () => proceduresApi.listDepartments(true),
    staleTime: 5 * 60_000,
  });

  const activeProcedures = proceduresData?.items?.filter((p) => p.status === 'published').length ?? 0;
  const pendingApprovals = proceduresData?.items?.filter((p) => p.status === 'pending' || p.status === 'pending_approval').length ?? 0;
  const aiQueriesToday = summary?.total_queries ?? 0;
  const activeDepts = departmentsData?.length ?? 0;

  const kpis = [
    {
      id: 'kpi-active-proc',
      title: 'Active Procedures',
      value: activeProcedures,
      trend: null,
      trendPositive: true,
      accentColor: '#004A8F',
      icon: <ClipboardList size={16} />,
    },
    {
      id: 'kpi-pending-approvals',
      title: 'Pending Approvals',
      value: pendingApprovals,
      trend: null,
      trendPositive: false,
      accentColor: '#E65100',
      icon: <CheckSquare size={16} />,
    },
    {
      id: 'kpi-ai-queries',
      title: 'Total AI Queries',
      value: aiQueriesToday,
      trend: null,
      trendPositive: true,
      accentColor: '#5B21B6',
      icon: <Sparkles size={16} />,
    },
    {
      id: 'kpi-departments',
      title: 'Active Departments',
      value: activeDepts,
      trend: null,
      trendPositive: true,
      accentColor: '#E8620A',
      icon: <Building2 size={16} />,
    },
    {
      id: 'kpi-success-rate',
      title: 'AI Success Rate',
      value: summary?.success_rate_pct != null ? `${Math.round(summary.success_rate_pct)}%` : '—',
      trend: null,
      trendPositive: true,
      accentColor: '#0891B2',
      icon: <TrendingUp size={16} />,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {kpis?.map((kpi) => (
        <KPICard key={kpi?.id} {...kpi} />
      ))}
    </div>
  );
}
