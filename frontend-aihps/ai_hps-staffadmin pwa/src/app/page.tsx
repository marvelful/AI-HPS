import React from 'react';
import AppLayout from '@/components/AppLayout';
import DashboardKPIs from './components/DashboardKPIs';
import DashboardRecentProcedures from './components/DashboardRecentProcedures';
import DashboardActivityFeed from './components/DashboardActivityFeed';
import DashboardAIStatus from './components/DashboardAIStatus';

export default function DashboardPage() {
  return (
    <AppLayout>
      <DashboardHeader />
      <DashboardKPIs />
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5 mt-5">
        <div className="xl:col-span-3">
          <DashboardRecentProcedures />
        </div>
        <div className="xl:col-span-2">
          <DashboardActivityFeed />
        </div>
      </div>
      <div className="mt-5">
        <DashboardAIStatus />
      </div>
    </AppLayout>
  );
}

function DashboardHeader() {
  return (
    <div className="flex items-start justify-between mb-5">
      <div>
        <h1 className="font-bold text-foreground" style={{ fontSize: '26px' }}>Dashboard</h1>
        <p className="text-muted-foreground mt-0.5" style={{ fontSize: '14px' }}>Good morning, Dr. Kamto</p>
      </div>
      <div className="text-right">
        <p className="text-muted-foreground" style={{ fontSize: '13px' }}>Friday, 4 July 2026</p>
      </div>
    </div>
  );
}