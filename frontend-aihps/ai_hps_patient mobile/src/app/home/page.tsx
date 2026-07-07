import React from 'react';
import MobileShell from '@/components/MobileShell';
import HomeHeader from '../components/HomeHeader';
import AIAssistantCard from '../components/AIAssistantCard';
import QuickActions from '../components/QuickActions';
import RecommendedProcedures from '../components/RecommendedProcedures';

export default function HomePage() {
  return (
    <MobileShell>
      <HomeHeader />
      <div className="px-4 pb-4 space-y-4 -mt-6">
        <AIAssistantCard />
        <QuickActions />
        <RecommendedProcedures />
      </div>
    </MobileShell>
  );
}
