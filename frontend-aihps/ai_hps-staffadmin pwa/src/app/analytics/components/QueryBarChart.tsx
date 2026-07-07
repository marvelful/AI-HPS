'use client';
import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { analyticsApi } from '@/lib/api';

interface DayCount { day: string; queries: number; isToday: boolean }

function buildDayCounts(queryEvents: any[]): DayCount[] {
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const counts: Record<string, number> = {};

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    counts[key] = 0;
  }

  for (const event of queryEvents) {
    const key = (event.created_at ?? event.timestamp ?? '').slice(0, 10);
    if (key in counts) counts[key]++;
  }

  return Object.entries(counts).map(([dateStr, queries], idx) => {
    const d = new Date(dateStr + 'T12:00:00');
    return {
      day: dayNames[d.getDay()],
      queries,
      isToday: idx === 6,
    };
  });
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: DayCount }>; label?: string }) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-md shadow-card-md px-3 py-2.5">
        <p className="font-semibold text-foreground mb-1" style={{ fontSize: '13px' }}>
          {label}{payload[0].payload.isToday ? ' (Today)' : ''}
        </p>
        <p className="text-muted-foreground" style={{ fontSize: '12px' }}>{payload[0].value.toLocaleString()} queries</p>
      </div>
    );
  }
  return null;
}

export default function QueryBarChart() {
  const { data: rawData, isLoading, isError } = useQuery({
    queryKey: ['analytics-queries-chart'],
    queryFn: () => analyticsApi.queries({ limit: 500 }),
    refetchInterval: 120_000,
  });

  const chartData = useMemo(() => {
    const events = Array.isArray(rawData) ? rawData : (rawData?.items ?? []);
    return buildDayCounts(events);
  }, [rawData]);

  if (isLoading) {
    return (
      <div className="flex items-end gap-3 px-4 py-4" style={{ height: '240px' }}>
        {[60, 80, 100, 70, 90, 45, 30].map((h, i) => (
          <div key={`bar-skel-${i}`} className="flex-1 bg-muted rounded-t animate-pulse" style={{ height: `${h}%` }} />
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center text-muted-foreground" style={{ height: '240px', fontSize: '13px' }}>
        Analytics service unavailable
      </div>
    );
  }

  const maxVal = Math.max(...chartData.map((d) => d.queries), 10);
  const topTick = Math.ceil(maxVal / 10) * 10;

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barSize={32}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
        <XAxis dataKey="day" tick={{ fontSize: 12, fill: 'var(--muted-foreground)' }} axisLine={false} tickLine={false} />
        <YAxis
          domain={[0, topTick]}
          tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--muted)', opacity: 0.5 }} />
        <Bar dataKey="queries" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.isToday ? '#0062B8' : '#004A8F'}
              opacity={entry.isToday ? 1 : 0.75}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
