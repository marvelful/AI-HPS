import React, { Suspense } from 'react';
import MobileShell from '@/components/MobileShell';
import AIAssistantScreen from './components/AIAssistantScreen';

export default function AIAssistantPage() {
  return (
    <MobileShell>
      <Suspense fallback={null}>
        <AIAssistantScreen />
      </Suspense>
    </MobileShell>
  );
}
