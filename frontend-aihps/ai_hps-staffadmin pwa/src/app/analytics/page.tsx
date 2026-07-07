import React from 'react';
import AppLayout from '@/components/AppLayout';
import AnalyticsKPIs from './components/AnalyticsKPIs';
import AnalyticsQueryChart from './components/AnalyticsQueryChart';
import AnalyticsTopProcedures from './components/AnalyticsTopProcedures';
import AnalyticsContentGaps from './components/AnalyticsContentGaps';

export default function AnalyticsPage() {
  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>Analytics</h1>
          <p className="text-muted-foreground mt-0.5" style={{ fontSize: '14px' }}>AI Usage Insights</p>
        </div>
        <select
          className="px-3 py-2 border border-border rounded-sm bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-colors"
          style={{ fontSize: '13px' }}
          defaultValue="Last 7 days"
        >
          {['Last 7 days', 'Last 30 days', 'Last 90 days', 'This year']?.map((opt) => (
            <option key={`range-${opt}`}>{opt}</option>
          ))}
        </select>
      </div>
      <AnalyticsKPIs />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mt-5">
        <div className="xl:col-span-3">
          <AnalyticsQueryChart />
        </div>
        <div className="xl:col-span-2">
          <AnalyticsTopProcedures />
        </div>
      </div>
      <div className="mt-5">
        <AnalyticsContentGaps />
      </div>
    </AppLayout>
  );
}